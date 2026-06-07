import { getProductById } from "~~/server/data/products";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
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
});
