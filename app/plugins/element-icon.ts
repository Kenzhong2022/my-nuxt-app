import * as ElementPlusIconsVue from "@element-plus/icons-vue";

export default defineNuxtPlugin((nuxtApp) => {
  // 遍历全部图标，全局注册到Vue实例
  Object.entries(ElementPlusIconsVue).forEach(([iconName, iconComponent]) => {
    nuxtApp.vueApp.component(iconName, iconComponent);
  });
});
