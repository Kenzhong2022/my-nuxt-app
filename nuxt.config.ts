// https://nuxt.com/docs/api/configuration/nuxt-config

import viteCompression from 'vite-plugin-compression';

/** 环境判定：nuxt dev 为 true，nuxt build（含 Netlify 部署构建）为 false */
const isDev = process.dev;

/** OAuth2 回调地址按环境区分（需与认证中心 clientDB 白名单注册的 redirect_uri 完全一致） */
const CALLBACK_URL = isDev ? 'http://localhost:3000/CallBack' : 'https://kk-shop-app.netlify.app/CallBack';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  routeRules: {
    '/': { redirect: '/dashboard' },
    '/**': {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        // credentialless：保持跨域隔离（crossOriginIsolated），但允许加载
        // 未携带 CORP/CORS 头的跨域图片等资源（require-corp 会直接拦截）
        'Cross-Origin-Embedder-Policy': 'credentialless',
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
    // JWT 签名密钥（与登录中心保持一致，声明后 NUXT_JWT_ACCESS_SECRET 才会映射到此处）
    jwt: {
      accessSecret: process.env.NUXT_JWT_ACCESS_SECRET,
      refreshSecret: process.env.NUXT_JWT_REFRESH_SECRET,
    },
    // Cloudinary 媒体上传
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    // Cloudflare 各服务的凭据按服务命名空间隔离，未来扩展 R2/KV/Images 互不干扰
    cloudflare: {
      // 账号级标识（非机密）：NUXT_CLOUDFLARE_ACCOUNT_ID
      accountId: '',
      // Workers AI（聊天 + 生图共用一个 token）：NUXT_CLOUDFLARE_WORKERS_AI_API_TOKEN
      workersAi: {
        apiToken: '',
      },
    },
    // 阿里百炼多模态生图
    dashscope: {
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseUrl: process.env.DASHSCOPE_BASE_URL,
    },
    // 百度翻译
    baidu: {
      appId: process.env.BAIDU_APPID,
      appKey: process.env.BAIDU_APPKEY,
    },

    // 公共配置：客户端也能访问（这里不要放任何敏感信息！）
    public: {
      title: 'My Nuxt App',
      version: '1.0.0',
      agentBaseUrl: process.env.NUXT_AGENT_BASE_URL,
      /** 登录页地址 */
      loginBase: process.env.LOGIN_BASE,
      /** OAuth2 客户端标识（需与认证中心注册的 client 一致） */
      clientId: process.env.OAUTH_CLIENT_ID || 'business-a',
      /** OAuth2 回调地址（环境变量优先，其次按 dev/prod 取默认值） */
      callbackUrl: process.env.OAUTH_CALLBACK_URL || CALLBACK_URL,
    },
  },
  app: {
    keepalive: true, // 或配置 include/exclude
    head: {},
  },
  pinia: {
    storesDirs: ['./stores'],
  },
  modules: ['@pinia/nuxt', '@element-plus/nuxt', '@nuxtjs/tailwindcss'],
  vite: {
    server: {
      // 开发服务器响应头（仅限开发环境时生效）
      headers: {
        // 启用跨域隔离（Cross-Origin Isolated）所必需的两个头
        // 1. COOP：限制弹窗交互只能同源，防止侧信道攻击
        'Cross-Origin-Opener-Policy': 'same-origin',
        // 2. COEP：credentialless 模式下保持隔离，同时允许无 CORP 头的跨域资源
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    },
    optimizeDeps: {
      include: [
        'lodash-unified',
        '@mediapipe/selfie_segmentation',
        '@mediapipe/camera_utils',
        '@element-plus/icons-vue',
        'dayjs', // CJS
        'dayjs/plugin/*.js',
        'gsap',
        'vue-draggable-plus',
      ],
    },
  },
  css: [
    '~/assets/css/main.css',
    '~/assets/iconfont/iconfont.css', // 图标字体
    'element-plus/theme-chalk/dark/css-vars.css', // Element Plus 暗黑主题变量（背景/文字色等）
  ],
  elementPlus: {
    // 自动导入所有组件
    importStyle: 'css',
  },

  nitro: {
    preset: 'cloudflare_page',
    cloudflare: {
      deployConfig: false, // ← 禁用自动生成的 wrangler.json
    },
    output: {
      dir: 'dist',
    },
    compressPublicAssets: true,
    // devProxy: {
    //   "/api/ai": {
    //     target: "https://chief-agent-alpha.vercel.app",
    //     changeOrigin: true,
    //   },
    // },
  },
});
