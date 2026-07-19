// https://nuxt.com/docs/api/configuration/nuxt-config

import { visualizer } from "rollup-plugin-visualizer";
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  runtimeConfig: {
    // 私有配置：只有服务端能访问，客户端永远看不到
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL,
    },
    databaseUrl: process.env.NUXT_DATABASE_URL,

    // 公共配置：客户端也能访问（这里不要放任何敏感信息！）
    public: {
      // 比如你的网站标题、版本号等
      title: "My Nuxt App",
      version: "1.0.0",
      // Agent API 地址（客户端组件需要访问，放公共配置）
      agentBaseUrl: process.env.NUXT_AGENT_BASE_URL,
    },
  },
  modules: ["@pinia/nuxt", "@element-plus/nuxt", "@nuxtjs/tailwindcss"],
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;

            // 🛑 服务端专用库：绝对不要打包进客户端
            if (
              id.includes("bcrypt") ||
              id.includes("jsonwebtoken") ||
              id.includes("@neondatabase") ||
              id.includes("@upstash") ||
              id.includes("node:")
            ) {
              return undefined;
            }

            // ⚠️ Vue 核心必须保留在主入口（不拆分）
            if (
              id.includes("/vue/") ||
              id.includes("/vue-router/") ||
              id.includes("/pinia/") ||
              id.includes("/@vueuse/")
            ) {
              return undefined;
            }

            // 🟢 只拆分绝对独立、无内部交叉依赖的巨型纯客户端库
            // 这些库通常只被你的业务代码直接 import，不与其他第三方库纠缠
            if (id.includes("gsap")) return "vendor.gsap";
            if (id.includes("openai")) return "vendor.openai";
            if (id.includes("qrcode")) return "vendor.qrcode";

            // 🔥 其他所有依赖（包括 element-plus）统一进入默认 vendor
            // 由于 element-plus 已通过模块实现按需导入，这里即使全部进 vendor，体积也完全可控
            return "vendor";
          },
        },
      },
    },
    optimizeDeps: {
      include: ["dayjs", "dayjs/plugin/*.js"],
    },
    plugins: [
      visualizer({
        filename: ".nuxt/stats.html", // 输出位置
        open: true, // 构建后自动打开浏览器
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  },
  css: [
    "~/assets/css/main.css",
    "~/assets/iconfont/iconfont.css",
    "element-plus/theme-chalk/dark/css-vars.css", // 引入element-plus的暗黑主题变量
  ],
  elementPlus: {
    // 自动导入所有组件
    importStyle: "scss",
  },

  nitro: {
    preset: "netlify", // 部署到Netlify时取消注释

    compressPublicAssets: true, // 静态资源仍然可以压缩
    devProxy: {},
  },
});
