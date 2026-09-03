<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="title-row">
        <h2 class="title">CHAT A.I+</h2>
        <!-- 关闭侧边栏（手机端抽屉 / 桌面折叠） -->
        <el-button class="close-btn" :icon="IconClose" text circle aria-label="关闭侧边栏" @click="emit('close')" />
      </div>
      <div class="action-row">
        <el-button type="primary">
          新建对话
          <el-icon class="icon-btn">
            <IconPlus />
          </el-icon>
        </el-button>
      </div>
    </div>

  <div class="sidebar-content">
      <!-- 对话分组1 -->
    <div class="group-title">
      <span>你的对话</span>
      <el-link type="danger">清空全部</el-link>
    </div>
    <SidebarConversationList />

    <!-- 对话分组2 -->
    <div class="group-title">近 7 天</div>
    <SidebarConversationList />
  </div>

    <div class="sidebar-footer">
      <div class="footer-item">
        <div class="icon-settings">
          <IconSettings />
        </div>
        设置
      </div>
      <div class="user-item">
        <el-avatar />
        <span>张三</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SidebarConversationList from './SidebarConversationList.vue'
import { IconPlus, IconSettings,IconClose } from '~/assets/svg'
const emit = defineEmits(['close'])
</script>

<style scoped lang="scss">
// ===================== 侧边栏容器 =====================
.sidebar {
  overflow: hidden;
  height: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  // ===================== 头部 =====================
  .sidebar-header {
    // 标题行：标题 + 关闭按钮
    .title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    h2 {
      margin: 0;
      font-size: var(--kk-font-size-extra-large);
    }

    .action-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
  }

  // ===================== 内容 =====================
  .sidebar-content {
    flex: 1;
    overflow: auto;
    scrollbar-gutter: stable;
      // ===================== 分组标题 =====================
    .group-title {
      display: flex;
      justify-content: space-between;
      padding-right: 1rem;
      font-size: var(--kk-font-size-small);
      color: var(--el-text-color-secondary);
      margin: 1.25rem 0 0.5rem;
    }
  }



  // ===================== 底部 =====================
  .sidebar-footer {
    margin-top: auto;

    .footer-item,
    .user-item {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: 0.5rem;
      padding: 0.5rem;
      border-radius: 0.5rem;
      width: 100%;
      margin: 0.25rem 0;
      font-size: var(--kk-font-size-base);
      color: var(--el-text-color-primary);
      cursor: pointer;
      // hover 浅填充 → active 默认填充，过渡平滑
      transition: background-color 0.2s, color 0.2s;

      &:hover {
        background: var(--el-fill-color-light);
      }

      &:active {
        background: var(--el-fill-color);
      }

      svg {
        // 图标跟随次要文字色，视觉弱于文字
        color: var(--el-text-color-secondary);
      }

      .icon-settings {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: var(--el-fill-color);
      }
    }

    // 头像占位：圆形，较深填充
    .avatar-placeholder {
      flex-shrink: 0;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: var(--el-fill-color-dark);
    }
  }
}
</style>