// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
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
    },
  },
  modules: ["@pinia/nuxt", "@element-plus/nuxt", "@nuxtjs/tailwindcss"],
  vite: {
    optimizeDeps: {
      include: ["dayjs", "dayjs/plugin/*.js"],
    },
  },
  css: ["~/assets/css/main.css"],
  elementPlus: {
    // 自动导入所有组件
    importStyle: "scss",
  },
  nitro: {
    preset: "netlify", // 部署到Netlify核心修改

    compressPublicAssets: true, // 静态资源仍然可以压缩
    devProxy: {},
    // 关键：为 SSE 接口禁用压缩
    routeRules: {
      "/api/chat/stream": {
        compress: false, // 禁用这个接口的压缩
      },
    },
  },
});
