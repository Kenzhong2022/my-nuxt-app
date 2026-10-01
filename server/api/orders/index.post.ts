import type { ApiResponse } from "~~/types/common";
import type { OrderCreateResult } from "~~/types/order";

/** 生成订单号：时间戳(13位) + 随机数(4位)，冲突概率极低且有 UNIQUE 约束兜底 */
function generateOrderNo(): string {
  return `${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * 提交订单（整条结算链路的库存闸门）
 * url: /api/orders
 * method: POST
 * body: CreateOrderPayload { addressId, productIds, remark? }
 *
 * 实现说明：
 * - Neon HTTP 驱动不支持交互式事务（sql.transaction 回调内不能 await 读结果再分支），
 *   因此整个下单流程合并为「一条 CTE 链语句」——单语句在 Postgres 天然原子，
 *   任一环节 store_raise() 抛错即整条语句回滚，效果等同事务
 * - CTE 链：picked 读购物车快照 → deducted 条件扣库存（stock >= 需求 才更新）
 *   → guard 三查（无可结算/地址无效/库存不足则 RAISE 中止）→ ord 写订单主表
 *   → its 写明细快照 → del 清购物车行
 * - 金额以服务端当前价格重算（numeric 精确乘法），不信任前端
 * - 地址/商品做快照（address_snapshot JSONB + 名称/图/单价冗余），历史订单不受后续删改影响
 *
 * return: 200 { orderId, orderNo, totalAmount } / 400 参数错误 / 404 地址或购物车无效
 *         / 409 库存不足（message 指明缺货商品）
 */
export default defineEventHandler(
  async (event): Promise<ApiResponse<OrderCreateResult | null>> => {
    // auth.global.ts 非白名单接口已校验 token 并注入 userId
    const userId = event.context.user!.userId;
    const body = await readBody<{
      addressId?: number;
      productIds?: number[];
      remark?: string;
    }>(event);

    const addressId = Number(body?.addressId);
    const productIds = (body?.productIds ?? [])
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n > 0);
    const remark = String(body?.remark ?? "").trim().slice(0, 200) || null;

    if (!Number.isInteger(addressId) || addressId <= 0) {
      return { code: 400, message: "请选择收货地址", data: null };
    }
    if (!productIds.length) {
      return { code: 400, message: "请选择结算商品", data: null };
    }

    const { sql } = setupDatabase();
    const orderNo = generateOrderNo();

    try {
      // = 单语句原子下单（任一支线 store_raise 抛错 → 全部回滚）=
      const rows = (await sql`
        WITH picked AS (
          -- 勾选且在购物车、在售的商品行（快照读）
          SELECT c.product_id, c.qty, p.name, p.image, p.price
          FROM store_cart_items c
          JOIN mall_products p ON p.id = c.product_id AND p.status = 1
          WHERE c.user_id = ${userId} AND c.product_id = ANY(${productIds}::bigint[])
        ),
        need AS (
          -- 按商品聚合需求数量
          SELECT product_id, SUM(qty)::int AS need_qty, MAX(name) AS name
          FROM picked
          GROUP BY product_id
        ),
        deducted AS (
          -- 条件扣库存：stock >= 需求 才更新（行锁排队，防超卖）；不足的商品不更新
          UPDATE mall_products m
          SET stock = m.stock - n.need_qty, sales = m.sales + n.need_qty, updated_at = now()
          FROM need n
          WHERE m.id = n.product_id AND m.status = 1 AND m.stock >= n.need_qty
          RETURNING m.id
        ),
        guard AS (
          -- 三查：任一不满足即 RAISE，整条语句中止回滚（含已执行的扣减）
          SELECT CASE
            WHEN NOT EXISTS (SELECT 1 FROM picked)
              THEN store_raise('购物车中没有可结算的商品')
            WHEN NOT EXISTS (
              SELECT 1 FROM store_addresses
              WHERE user_id = ${userId} AND id = ${addressId}
            )
              THEN store_raise('收货地址不存在，请重新选择')
            WHEN EXISTS (
              SELECT 1 FROM need n
              WHERE NOT EXISTS (SELECT 1 FROM deducted d WHERE d.id = n.product_id)
            )
              THEN store_raise(
                '「' || (
                  SELECT string_agg(n.name, '、') FROM need n
                  WHERE NOT EXISTS (SELECT 1 FROM deducted d WHERE d.id = n.product_id)
                ) || '」库存不足，请调整数量'
              )
            ELSE 'ok'
          END
        ),
        ord AS (
          -- 写订单主表：地址 JSONB 快照 + 待支付 + 30 分钟超时
          INSERT INTO store_orders (order_no, user_id, total_amount, address_snapshot, status, remark, expired_at)
          SELECT ${orderNo}, ${userId},
                 (SELECT SUM(price * qty) FROM picked),
                 (SELECT jsonb_build_object(
                    'receiver', receiver, 'phone', phone,
                    'region', region, 'detail', detail
                  ) FROM store_addresses
                  WHERE user_id = ${userId} AND id = ${addressId}),
                 'pending', ${remark}, now() + interval '30 minutes'
          FROM guard
          RETURNING id
        ),
        its AS (
          -- 写订单明细（商品名/图/单价快照冗余）
          INSERT INTO store_order_items (order_id, product_id, product_name, product_image, unit_price, qty)
          SELECT o.id, p.product_id, p.name, p.image, p.price, p.qty
          FROM picked p CROSS JOIN ord o
        ),
        del AS (
          -- 清除已下单的购物车行
          DELETE FROM store_cart_items
          WHERE user_id = ${userId} AND product_id IN (SELECT product_id FROM picked)
        )
        SELECT ord.id, (SELECT SUM(price * qty) FROM picked) AS total_amount
        FROM ord
      `) as unknown as { id: string; total_amount: string }[];

      const row = rows[0];
      if (!row) {
        return { code: 500, message: "创建订单失败，请重试", data: null };
      }

      return {
        code: 200,
        message: "success",
        data: {
          orderId: Number(row.id),
          orderNo,
          totalAmount: Number(row.total_amount),
        },
      };
    } catch (error) {
      // store_raise 抛出的业务错误按消息内容映射状态码（语句已整体回滚，库存未变）
      const msg = String((error as Error).message ?? "");
      if (msg.includes("库存不足")) {
        return { code: 409, message: msg, data: null };
      }
      if (msg.includes("地址不存在") || msg.includes("没有可结算")) {
        return { code: 404, message: msg, data: null };
      }
      console.error("提交订单失败:", error);
      return { code: 500, message: "提交订单失败", data: null };
    }
  },
);
