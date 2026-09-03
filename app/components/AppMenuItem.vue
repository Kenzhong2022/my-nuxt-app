<template>
  <!-- 有子级 → 可展开的父级（递归渲染下一层） -->
  <el-sub-menu v-if="item.children?.length" :index="item.path">
    <template #title>
      <el-icon v-if="item.icon">
        <component :is="item.icon" />
      </el-icon>
      <span>{{ item.name }}</span>
    </template>
    <AppMenuItem
      v-for="child in item.children"
      :key="child.id"
      :item="child"
      @select="onSelect"
    />
  </el-sub-menu>

  <!-- 无子级 → 叶子菜单项 -->
  <el-menu-item v-else :index="item.path" @click="onSelect(item)">
    <el-icon v-if="item.icon">
      <component :is="item.icon" />
    </el-icon>
    <span>{{ item.name }}</span>
  </el-menu-item>
</template>

<script setup lang="ts">
import type { MenuItem } from './AppMenu.vue';

/**
 * 递归菜单节点：组件自嵌套，支持任意层级子菜单
 * 叶子项点击后逐层向上冒泡 select 事件，最终由 AppMenu 转为 menu-click
 */
defineProps<{
  item: MenuItem;
}>();

const emit = defineEmits<{
  (e: 'select', item: MenuItem): void;
}>();

function onSelect(item: MenuItem) {
  emit('select', item);
}
</script>