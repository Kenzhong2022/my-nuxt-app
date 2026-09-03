/**
 * 覆盖 vite/client 中 "*.svg 导出为 string" 的默认声明：
 * 本项目经 vite-svg-loader(defaultImport: 'component') 编译，
 * .svg 默认导出为 Vue 组件。
 * 位置说明：app/ 下所有文件被 .nuxt/tsconfig.app.json 稳定 include，
 * 根目录 types/ 子目录不在任何 tsconfig 的 include 内（死区）。
 */
declare module '*.svg' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<{}, {}, any>
  export default component
}
