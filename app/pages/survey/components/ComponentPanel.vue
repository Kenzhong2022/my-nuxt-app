<template>
  <div class="component-panel">
    <h3>组件库</h3>
    <p class="tip">点击添加问题</p>
    <div
      v-for="item in componentMetaList"
      :key="item.type"
      class="panel-item"
      @click="emit('add', item.type)"
    >
      <el-icon><component :is="item.icon" /></el-icon>
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { componentMetaList } from "../config/componentMeta";
import type { Survey, Question, QuestionType } from "~~/types/survey";

// 全局注册图标（确保图标可用）
// 如果已全局注册，可以省略这行；这里仅为了类型提示。
// 若未全局注册，需在 main.ts 中注册所有图标。
// 示例：app.component('Edit', Edit) 等

const emit = defineEmits<{
  (e: "add", type: QuestionType): void;
}>();
</script>

<style scoped>
.component-panel h3 {
  margin-top: 0;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}
.tip {
  font-size: 12px;
  color: #999;
  margin: 8px 0 16px;
}
.panel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}
.panel-item:hover {
  background: #ecf5ff;
  color: #409eff;
}
.panel-item .el-icon {
  font-size: 18px;
}
</style>
