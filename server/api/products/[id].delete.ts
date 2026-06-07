import { deleteProduct } from "~~/server/data/products";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
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
});
