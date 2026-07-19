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
          // manualChunks(id: string) {
          //   if (!id.includes("node_modules")) return;

          //   // 将所有第三方库合并到一个 chunk，避免循环依赖
          //   return "vendor";
          // },
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;

            // 1. 超大独立库：单独拆分（>500KB），这些库不依赖 Element Plus
            if (id.includes("gsap")) return "vendor-gsap";
            if (id.includes("openai")) return "vendor-openai";

            // 2. 其他所有第三方库：合并到一个 chunk，避免循环依赖
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
