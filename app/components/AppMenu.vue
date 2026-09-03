<template>
  <el-menu
    :default-active="defaultActive"
    :default-openeds="defaultOpeneds"
    class="border-none menu-container"
  >
    <AppMenuItem
      v-for="menu in menuData"
      :key="menu.id"
      :item="menu"
      @select="handleItemClick"
    />
  </el-menu>
</template>

<script setup lang="ts">
export interface MenuItem {
  id: number;
  parentId: number;
  name: string;
  icon?: string;
  path: string;
  children?: MenuItem[];
  sort?: number;
}

interface Props {
  menuData: MenuItem[];
  defaultActive?: string;
  defaultOpeneds?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  defaultActive: "",
  defaultOpeneds: () => [],
});

const emit = defineEmits<{
  (e: "menu-click", item: MenuItem): void;
}>();

function handleItemClick(item: MenuItem) {
  emit("menu-click", item);
}
</script>

<style scoped lang="scss">
:deep(.el-menu-item.is-active) {
  color: var(--el-menu-active-color);
  background: var(--el-color-primary-light-7);
}
</style>