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
            // 只处理 node_modules
            if (!id.includes("node_modules")) return;

            // 1. 超大库：单独拆（>100KB）
            if (id.includes("element-plus") && !id.includes("icons-vue")) {
              return "vendor-element-plus";
            }
            if (id.includes("@element-plus/icons-vue")) {
              return "vendor-element-icons";
            }
            if (id.includes("gsap")) {
              return "vendor-gsap";
            }

            // 2. Vue 生态：合并
            if (
              id.includes("vue") ||
              id.includes("vue-router") ||
              id.includes("pinia") ||
              id.includes("@pinia/nuxt") ||
              id.includes("@vueuse/core")
            ) {
              return "vendor-vue";
            }

            // 3. 其他第三方库：合并
            return "vendor-others";
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
    preset: "netlify", // 部署到Netlify核心修改

    compressPublicAssets: true, // 静态资源仍然可以压缩
    devProxy: {},
  },
});
