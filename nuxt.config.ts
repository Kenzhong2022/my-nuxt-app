// https://nuxt.com/docs/api/configuration/nuxt-config
import Components from 'unplugin-vue-components/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import viteCompression from 'vite-plugin-compression';
import svgLoader from 'vite-svg-loader';

/** 环境判定：nuxt dev 为 true，nuxt build（含部署构建）为 false
 *  注意：nuxt.config 上下文中 process.dev 未被 @nuxt/cli 赋值（恒为 undefined），改用 NODE_ENV 判定 */
const isDev = process.env.NODE_ENV === 'development';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  hooks: {
    // pages:extend —— 过滤页面路由注册：pages 目录下的局部组件/配置文件不应生成可访问路由
    'pages:extend'(pages) {
      // 匹配 components 子目录，以及 agent/survey 模块内散落的组件与配置文件
      const componentFilePattern =
        /(\/|\\)components(\/|\\)|\/(ChatArea|AIChatInput|HistorySidebar|componentMeta)\.\w+$/;
      function removeFrom(list: typeof pages) {
        for (const route of list.slice()) {
          if (componentFilePattern.test(route.file ?? '')) {
            list.splice(list.indexOf(route), 1);
            continue;
          }
          if (route.children) removeFrom(route.children);
        }
      }
      removeFrom(pages);

      // dev 下打印每条注册路由（path / name / 源文件 / definePageMeta 编译产物 meta，输出到 dev server 终端）
      // 注意：nuxt.config 上下文中 process.dev 未被 @nuxt/cli 赋值（恒为 undefined），改用 NODE_ENV 判定
      if (process.env.NODE_ENV === 'development') {
        function dumpMeta(list: typeof pages, indent = '') {
          for (const route of list) {
            const meta = route.meta && Object.keys(route.meta).length > 0 ? JSON.stringify(route.meta) : '';
            // console.log(`${indent}${route.path}  [${route.name ?? '-'}]  ${route.file ?? ''}  ${meta}`);
            if (route.children?.length) dumpMeta(route.children, `${indent}  `);
          }
        }
        dumpMeta(pages);
      }
    },
  },
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
  // 全部字段留空/默认值，值一律由 NUXT_ 前缀环境变量在运行时自动映射注入
  // （映射规则：runtimeConfig.a.bC → NUXT_A_BC，public 层多一段 NUXT_PUBLIC_）
  runtimeConfig: {
    // 私有配置：只有服务端能访问，客户端永远看不到
    deepseek: {
      // NUXT_DEEPSEEK_API_KEY / NUXT_DEEPSEEK_BASE_URL
      apiKey: '',
      baseURL: '',
    },
    // NUXT_DATABASE_URL
    databaseUrl: '',
    // JWT 签名密钥（与登录中心保持一致）：NUXT_JWT_ACCESS_SECRET / NUXT_JWT_REFRESH_SECRET
    jwt: {
      accessSecret: '',
      refreshSecret: '',
    },
    // Cloudinary 媒体上传：NUXT_CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET
    cloudinary: {
      cloudName: '',
      apiKey: '',
      apiSecret: '',
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
    // 阿里百炼多模态生图：NUXT_DASHSCOPE_API_KEY / NUXT_DASHSCOPE_BASE_URL
    dashscope: {
      apiKey: '',
      baseUrl: '',
    },
    // 百度翻译：NUXT_BAIDU_APP_ID / NUXT_BAIDU_APP_KEY（注意 appId→APP_ID 蛇形映射）
    baidu: {
      appId: '',
      appKey: '',
    },
    // Upstash Redis：NUXT_UPSTASH_REDIS_REST_URL / NUXT_UPSTASH_REDIS_REST_TOKEN
    upstash: {
      redisRestUrl: '',
      redisRestToken: '',
    },
    // 取餐码防伪签名密钥：NUXT_QRCODE_SECRET
    qrcodeSecret: '',

    // 公共配置：客户端也能访问（这里不要放任何敏感信息！）
    public: {
      title: 'My Nuxt App',
      version: '1.0.0',
      // NUXT_PUBLIC_AGENT_BASE_URL
      agentBaseUrl: '',
      /** 登录页地址：NUXT_PUBLIC_LOGIN_BASE */
      loginBase: '',
      /** OAuth2 客户端标识（需与认证中心注册的 client 一致）：NUXT_PUBLIC_CLIENT_ID */
      clientId: 'business-a',
      /** OAuth2 回调地址覆盖项：默认留空，运行时按当前站点 origin 拼接 /CallBack（见 useAuth.getCallbackUrl）；仅在需要固定地址时设置 NUXT_PUBLIC_CALLBACK_URL */
      callbackUrl: '',
      /** 高德地图 Web 端 Key：NUXT_PUBLIC_AMAP_KEY */
      amapKey: '',
      /** 高德地图安全密钥（JS API 加载前设置）：NUXT_PUBLIC_AMAP_SECURITY_CODE */
      amapSecurityCode: '',
      /** 聊天 WebSocket 服务地址（原生 WebSocket，路径 /room/<roomId>）：NUXT_PUBLIC_WS_URL */
      wsUrl: 'wss://chat.kkyy.dpdns.org',
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
    plugins: [
      svgLoader({ defaultImport: 'component' }),
      // unplugin-icons 核心插件：负责把 IconsResolver 生成的 ~icons/icon-park/xxx
      // 虚拟模块编译成 inline SVG 组件（必须在 Components 之前注册）
      Icons({
        compiler: 'vue3',
        autoInstall: false, // 依赖已通过 pnpm 显式安装（@iconify-json/icon-park）
      }),
      // IconPark 图标按需加载：<i-icon-park-xxx /> 编译期自动解析为 inline SVG 组件（SSR 安全）
      // dirs: [] —— 本地组件由 Nuxt 自身的 auto-import 负责，此处只处理图标解析器，避免重复注册
      Components({
        dirs: [], // 本地组件目录（不包含图标组件）
        resolvers: [
          IconsResolver({
            prefix: 'i', // 图标组件前缀
            enabledCollections: ['icon-park'], // 启用 IconPark 图标集合
          }),
        ],
        dts: 'types/components.d.ts', // 生成模板里 <i-icon-park-xxx /> 的类型提示
      }),
    ],
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
    // dev 用默认 node-server，跳过 Cloudflare(workerd) 本地仿真的启动开销；生产构建走 cloudflare-pages
    preset: isDev ? undefined : 'cloudflare-pages',
    // Cloudflare 专属配置仅生产构建需要；未来新增生产专属项都收进此条件展开
    ...(isDev
      ? {}
      : {
          cloudflare: {
            deployConfig: false, // ← 禁用自动生成的 wrangler.json
          },
        }),
    output: {
      dir: 'dist',
    },
    compressPublicAssets: !isDev,
    // devProxy: {
    //   "/api/ai": {
    //     target: "https://chief-agent-alpha.vercel.app",
    //     changeOrigin: true,
    //   },
    // },
  },
});
