import type { Product } from "~~/types/product";

export const productsData: Product[] = [
  {
    id: 1,
    name: "无线蓝牙耳机",
    price: 199,
    originalPrice: 299,
    image: "https://picsum.photos/400/400?random=1",
    rating: 4.5,
    sales: 2580,
    tags: ["热销"],
    category: "数码",
    stock: 100,
  },
  {
    id: 2,
    name: "智能手表 Pro",
    price: 1299,
    originalPrice: 1599,
    image: "https://picsum.photos/400/400?random=2",
    rating: 4.8,
    sales: 1560,
    tags: ["新品"],
    category: "数码",
    stock: 50,
  },
  {
    id: 3,
    name: "运动跑步鞋",
    price: 359,
    image: "https://picsum.photos/400/400?random=3",
    rating: 4.3,
    sales: 3200,
    category: "服饰",
    stock: 200,
  },
  {
    id: 4,
    name: "便携式充电宝 20000mAh",
    price: 129,
    originalPrice: 169,
    image: "https://picsum.photos/400/400?random=4",
    rating: 4.6,
    sales: 4890,
    tags: ["热销"],
    category: "数码",
    stock: 300,
  },
  {
    id: 5,
    name: "真皮商务背包",
    price: 459,
    originalPrice: 599,
    image: "https://picsum.photos/400/400?random=5",
    rating: 4.4,
    sales: 890,
    category: "箱包",
    stock: 80,
  },
  {
    id: 6,
    name: "无线机械键盘",
    price: 299,
    image: "https://picsum.photos/400/400?random=6",
    rating: 4.7,
    sales: 1650,
    tags: ["新品"],
    category: "数码",
    stock: 120,
  },
  {
    id: 7,
    name: "护肤套装 保湿修护",
    price: 258,
    originalPrice: 388,
    image: "https://picsum.photos/400/400?random=7",
    rating: 4.2,
    sales: 2100,
    category: "美妆",
    stock: 150,
  },
  {
    id: 8,
    name: "智能台灯 护眼学习",
    price: 169,
    image: "https://picsum.photos/400/400?random=8",
    rating: 4.5,
    sales: 980,
    category: "家居",
    stock: 200,
  },
  {
    id: 9,
    name: "运动水杯 800ml",
    price: 59,
    originalPrice: 89,
    image: "https://picsum.photos/400/400?random=9",
    rating: 4.1,
    sales: 4500,
    category: "运动",
    stock: 500,
  },
  {
    id: 10,
    name: "高清投影仪",
    price: 899,
    originalPrice: 1299,
    image: "https://picsum.photos/400/400?random=10",
    rating: 4.6,
    sales: 680,
    tags: ["热销"],
    category: "数码",
    stock: 60,
  },
];

export function getProducts(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}) {
  const { page = 1, pageSize = 10, search = "", category = "" } = params;

  let filtered = [...productsData];

  if (search) {
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }

  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const list = filtered.slice(start, end);

  return {
    list,
    total,
    page,
    pageSize,
  };
}

export function getProductById(id: number) {
  return productsData.find((p) => p.id === id) || null;
}

export function createProduct(data: Omit<Product, "id">) {
  const newProduct = {
    ...data,
    id: Math.max(...productsData.map((p) => p.id)) + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  productsData.push(newProduct);
  return newProduct;
}

/**
 * 更新商品
 * @param id 商品ID
 * @param data 更新数据
 * @returns 更新后的商品数据
 */
export function updateProduct(id: number, data: Partial<Product>) {
  const index = productsData.findIndex((p) => p.id === id); // 查找商品索引，-1表示不存在
  if (index === -1 || !productsData[index]) return null; // 商品不存在或索引无效

  productsData[index] = {
    ...productsData[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  return productsData[index];
}

export function deleteProduct(id: number) {
  const index = productsData.findIndex((p) => p.id === id);
  if (index === -1) return false;

  productsData.splice(index, 1);
  return true;
}
