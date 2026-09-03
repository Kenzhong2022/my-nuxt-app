<template>
  <el-container class="chat-ai-container">
    <!-- 左侧侧边栏 -->
    <el-aside class="chat-ai-aside" width="15rem">
      <ChatAiSidebar />
    </el-aside>
    <!-- 右侧主区域 -->
    <el-main class="chat-ai-main">
      <ChatAiMain />
    </el-main>
    <!-- 右侧悬浮按钮 升级专业版 -->
    <div class="pro-float-btn cursor-pointer">升级专业版</div>
  </el-container>
</template>

<script setup lang="ts">
import ChatAiSidebar from './ChatAiSidebar.vue';
import ChatAiMain from './ChatAiMain.vue';
</script>

<style scoped lang="scss">
// ===================== 页面容器 =====================
.chat-ai-container {
  height: inherit;
  background-color: var(--el-bg-color-page);
}

// ===================== 侧边栏 =====================
.chat-ai-aside {
  background: var(--el-bg-color);
  border-radius: 1rem;
  margin: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

// ===================== 主区域 =====================
.chat-ai-main {
  padding: 0.75rem;
}

// ===================== 悬浮按钮 =====================
.pro-float-btn {
  $btn-width: 32px;
  position: fixed;
  right: 0;
  top: 50%;
  width: $btn-width;
  transform: translateY(-50%);
  // primary 背景 + white 文字是官方 Button 的标准组合；
  // hover 亮化用 dark-2 变体（暗色下自动更亮）
  background-color: var(--el-color-primary);
  color: var(--el-color-white);
  padding: 3rem 0.375rem;
  border-top-left-radius: 0.75rem;
  border-bottom-left-radius: 0.75rem;
  writing-mode: vertical-rl;
  letter-spacing: 1px;
  font-size: var(--kk-font-size-small);
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--el-color-primary-dark-2);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: $btn-width;
    aspect-ratio: 1/1;
    transform: translateY(-99%);
    background: radial-gradient(
      circle $btn-width at left top,
      transparent $btn-width,
      var(--el-color-primary) calc($btn-width + 1px) 100%
    );
  }
  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: $btn-width;
    aspect-ratio: 1/1;
    transform: translateY(99%);
    background: radial-gradient(
      circle $btn-width at left bottom,
      transparent $btn-width,
      var(--el-color-primary) calc($btn-width + 1px) 100%
    );
  }
}
</style>
