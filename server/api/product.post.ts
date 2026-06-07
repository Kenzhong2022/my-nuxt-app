export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  try {
    // 调用外部 API 创建产品
    const newProduct = await $fetch("https://fakestoreapi.com/products", {
      method: "POST",
      body: {
        title: body.title || "未命名商品",
        price: body.price || 0,
        description: body.description || "",
        image: body.image || "https://picsum.photos/400/400",
        category: body.category || "通用",
      },
    });

    return {
      code: 201,
      message: "创建成功",
      data: newProduct,
    };
  } catch (error) {
    console.error("调用外部 API 创建产品失败:", error);
    return {
      code: 500,
      message: "创建失败",
      data: null,
    };
  }
});
