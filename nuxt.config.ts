// https://nuxt.com/docs/api/configuration/nuxt-config

import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  routeRules: {
    "/": { redirect: "/dashboard" },
    "/**": {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
  },
  runtimeConfig: {
    // 私有配置：只有服务端能访问，客户端永远看不到
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL,
    },
    databaseUrl: process.env.NUXT_DATABASE_URL,

    // 公共配置：客户端也能访问（这里不要放任何敏感信息！）
    public: {
      title: "My Nuxt App",
      version: "1.0.0",
      agentBaseUrl: process.env.NUXT_AGENT_BASE_URL,
      /** 登录页地址 */
      loginBase: process.env.LOGIN_BASE,
    },
  },
  app: {
    keepalive: true, // 或配置 include/exclude
    head: {},
  },
  pinia: {
    storesDirs: ["./stores"],
  },
  modules: [
    "@pinia/nuxt",
    "@pinia-plugin-persistedstate/nuxt",
    "@element-plus/nuxt",
    "@nuxtjs/tailwindcss",
  ],
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
    server: {
      // 开发服务器响应头（仅限开发环境时生效）
      headers: {
        // 启用跨域隔离（Cross-Origin Isolated）所必需的两个头
        // 1. COOP：限制弹窗交互只能同源，防止侧信道攻击
        "Cross-Origin-Opener-Policy": "same-origin",
        // 2. COEP：要求所有加载的子资源必须显式支持跨域，否则拒绝加载
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    optimizeDeps: {
      // 排除 onnxruntime-web 的预构建
      // 原因：该包体积大且包含 .wasm 文件，预构建会破坏其动态加载机制，导致运行时崩溃
      exclude: ["onnxruntime-web"],
      include: [
        "@mediapipe/selfie_segmentation",
        "@mediapipe/camera_utils",
        "@element-plus/icons-vue",
        "dayjs", // CJS
        "dayjs/plugin/*.js",
        "gsap",
        "vue-draggable-plus",
      ],
    },
    plugins: [
      visualizer({
        filename: ".nuxt/stats.html", // 输出位置
        open: true, // 构建后自动打开浏览器
        gzipSize: true,
        brotliSize: true,
      }),
      // Brotli 压缩（压缩率更高，现代浏览器支持）
      viteCompression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 10240,
        deleteOriginFile: false,
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
    devProxy: {
      "/api/ai": {
        target: "https://chief-agent-alpha.vercel.app",
        changeOrigin: true,
      },
    },
  },
});
