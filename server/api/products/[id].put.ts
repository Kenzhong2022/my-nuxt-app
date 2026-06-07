import { updateProduct } from "~~/server/data/products";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
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
});
