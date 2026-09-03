<template>
  <el-container class="chat-ai-container">
    <!-- 左侧侧边栏（桌面端常驻；手机端抽屉） -->
    <el-aside class="chat-ai-aside" width="15rem">
      <ChatAiSidebar @close="sidebarOpen = false" />
    </el-aside>

    <!-- 手机端抽屉侧边栏 -->
    <el-drawer
      v-model="sidebarOpen"
      class="chat-ai-drawer"
      direction="ltr"
      size="16rem"
      :with-header="false"
      :z-index="2000"
    >
      <ChatAiSidebar @close="sidebarOpen = false" />
    </el-drawer>

    <!-- 右侧主区域 -->
    <el-main class="chat-ai-main">
      <!-- 手机端打开侧边栏按钮 -->
      <el-button class="mobile-menu-btn" circle aria-label="打开侧边栏" @click="sidebarOpen = true">
        <el-icon><IconHistory /></el-icon>
      </el-button>
      <ChatAiMain />
    </el-main>
    <!-- 右侧悬浮按钮 升级专业版 -->
    <div class="pro-float-btn cursor-pointer">升级专业版
      <IconHistory />
    </div>
  </el-container>
</template>

<script setup lang="ts">
import ChatAiSidebar from './ChatAiSidebar.vue';
import ChatAiMain from './ChatAiMain.vue';
import { IconHistory } from '~/assets/svg'

// 手机端抽屉开关（桌面端侧边栏常驻，不受此状态影响）
const sidebarOpen = ref(false);
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

// ===================== 抽屉侧边栏（手机端） =====================
// el-drawer 传送至 body，scoped 样式需 :deep 透传（此处只设 padding，内部样式由 ChatAiSidebar 自带）
:global(.chat-ai-drawer) {
  .el-drawer__body {
    padding: 0.5rem;
  }
}

// ===================== 主区域 =====================
.chat-ai-main {
  padding: 0.75rem;
}

// 手机端打开侧边栏按钮（默认隐藏，窄屏显示）
.mobile-menu-btn {
  display: none;

  // el-icon 内 SVG 需撑满容器，跟随按钮文字色（currentColor）
  :deep(svg) {
    width: 100%;
    height: 100%;
  }
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

// ===================== 手机端适配（≤768px） =====================
@media (max-width: 768px) {
  // 桌面常驻侧边栏隐藏，改用抽屉
  .chat-ai-aside {
    display: none;
  }

  .chat-ai-main {
    padding: 0.5rem;
  }

  .mobile-menu-btn {
    display: inline-flex;
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    z-index: 10;
  }

  // 悬浮按钮过宽遮挡内容，缩窄
  .pro-float-btn {
    $btn-width: 24px;
    width: $btn-width;
    padding: 2rem 0.25rem;

    &::after,
    &::before {
      width: $btn-width;
      background: radial-gradient(
        circle $btn-width at left top,
        transparent $btn-width,
        var(--el-color-primary) calc($btn-width + 1px) 100%
      );
    }
  }
}
</style>
