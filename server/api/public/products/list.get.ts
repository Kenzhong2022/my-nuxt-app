import type { Product } from "~~/types/product";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = Number(query.page) || 1;
  const pageSize = Number(query.pageSize) || 10;

  try {
    // 调用外部 API（fakestoreapi）
    const products = await $fetch<Product[]>(
      "https://fakestoreapi.com/products",
      {
        method: "GET",
      },
    );

    // 本地分页处理
    const total = products.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const list = products.slice(start, end);

    return {
      code: 200,
      message: "success",
      data: list,
      pagination: {
        current: page,
        pageSize: pageSize,
        total: total,
      },
    };
  } catch (error) {
    console.error("请求外部 API 失败:", error);
    return {
      code: 500,
      message: "获取商品列表失败",
      data: [],
      pagination: {
        current: page,
        pageSize: pageSize,
        total: 0,
      },
    };
  }
});
