// plugins/directives.ts - 全局自定义指令注册（薄注册层，指令逻辑在 app/directives/）
import { hasPermi, hasRole } from '~/directives/hasPermi';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('hasPermi', hasPermi);
  nuxtApp.vueApp.directive('hasRole', hasRole);
});
