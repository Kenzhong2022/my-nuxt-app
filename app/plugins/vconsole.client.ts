import { defineNuxtPlugin } from '#app'
// 动态导入，避免服务端渲染报错
import VConsole from 'vconsole'

export default defineNuxtPlugin(() => {
  // 仅在开发环境下启用，防止打包到生产环境
  if (process.env.NODE_ENV === 'development') {
    // 确保只在客户端执行
    if (typeof window !== 'undefined') {
      // 可以加个延迟，避免影响页面首屏加载性能
      setTimeout(() => {
        new VConsole()
      }, 500)
    }
  }
})