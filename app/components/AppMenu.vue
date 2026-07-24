<template>
  <el-menu
    :default-active="defaultActive"
    :default-openeds="defaultOpeneds"
    :mode="mode"
    class="border-none"
  >
    <template v-for="menu in menuData">
      <el-sub-menu
        v-if="menu.children?.length"
        :key="menu.id + '-sub'"
        :index="menu.path"
      >
        <template #title>
          <slot name="submenu-title" :menu="menu">
            <el-icon>
              <component :is="menu.icon" />
            </el-icon>
            <span>{{ menu.name }}</span>
          </slot>
        </template>
        <el-menu-item
          v-for="child in menu.children"
          :key="child.id"
          :index="child.path"
          @click="handleItemClick(child)"
        >
          {{ child.name }}
        </el-menu-item>
      </el-sub-menu>

      <el-menu-item
        v-else
        :key="menu.id + '-item'"
        :index="menu.path"
        @click="handleItemClick(menu)"
      >
        <el-icon>
          <component :is="menu.icon" />
        </el-icon>
        {{ menu.name }}
      </el-menu-item>
    </template>
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
}

interface Props {
  menuData: MenuItem[];
  mode?: "horizontal" | "vertical";
  defaultActive?: string;
  defaultOpeneds?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  mode: "vertical",
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
