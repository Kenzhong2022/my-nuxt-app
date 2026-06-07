import { getProductById, updateProduct, deleteProduct, createProduct } from "~~/server/data/products";

export default defineEventHandler(async (event) => {
  const method = event.method;
  const id = getRouterParam(event, "id");

  // GET /api/products/:id - 获取单个商品
  if (method === "GET" && id) {
    const product = getProductById(Number(id));
    if (!product) {
      return {
        code: 404,
        message: "商品不存在",
        data: null,
      };
    }
    return {
      code: 200,
      message: "success",
      data: product,
    };
  }

  // PUT /api/products/:id - 更新商品
  if (method === "PUT" && id) {
    const body = await readBody(event);
    const updated = updateProduct(Number(id), body);
    if (!updated) {
      return {
        code: 404,
        message: "商品不存在",
        data: null,
      };
    }
    return {
      code: 200,
      message: "更新成功",
      data: updated,
    };
  }

  // DELETE /api/products/:id - 删除商品
  if (method === "DELETE" && id) {
    const success = deleteProduct(Number(id));
    if (!success) {
      return {
        code: 404,
        message: "商品不存在",
        data: null,
      };
    }
    return {
      code: 200,
      message: "删除成功",
      data: null,
    };
  }

  return {
    code: 405,
    message: "方法不允许",
    data: null,
  };
});
