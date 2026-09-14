<template>
  <div class="sidebar-left">
    <div class="sidebar-avatar">
      <el-avatar src="https://picsum.photos/id/1005/40/40" />
    </div>

    <div class="sidebar-menu">
      <div class="menu-item active">
        <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M33 38H22V30H36V22H44V38H39L36 41L33 38Z"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M4 6H36V30H17L13 34L9 30H4V6Z"
            fill="currentColor"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M19 18H20" stroke="#FFF" stroke-width="4" stroke-linecap="round" />
          <path d="M26 18H27" stroke="#FFF" stroke-width="4" stroke-linecap="round" />
          <path d="M12 18H13" stroke="#FFF" stroke-width="4" stroke-linecap="round" />
        </svg>
      </div>
      <div class="menu-item">
        <el-icon size="24"><User /></el-icon>
      </div>
      <div class="menu-item">
        <el-icon size="24"><Box /></el-icon>
      </div>
      <div class="menu-item">
        <el-icon size="24"><Location /></el-icon>
      </div>
    </div>

    <div class="sidebar-bottom">
      <div class="menu-item">
        <el-icon size="24"><List /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { User, Box, Location, List } from '@element-plus/icons-vue';
</script>

<style scoped>
.sidebar-left {
  width: 60px; /* 定宽 */
  flex-shrink: 0; /* 不允许被压缩 */
  background: #252525;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 20px;
}
.sidebar-avatar {
  margin-bottom: 10px;
}
.sidebar-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.menu-item {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  color: #999;
}
.menu-item:hover {
  background: #383838;
  color: #fff;
}
.menu-item.active {
  background: #383838;
  color: #fff;
}
.sidebar-bottom {
  margin-top: auto;
}
</style>
