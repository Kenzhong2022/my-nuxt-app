<template>
  <el-header class="border-b" ref="headerRef">
    <!-- 主题选择器面板：fixed 定位悬浮于头部下方，随 showColorPicker 显隐 -->
    <ThemeColorPicker
      :style="{ top: headerTop + 'px' }"
      v-if="showColorPicker"
      class="fixed z-[1] right-4 w-64"
      @close="showColorPicker = false"
    />
    <div class="header-inner">
      <h1>管理后台</h1>
      <el-switch
        class="switchDark"
        :model-value="isDark"
        @update:model-value="(newVal) => (isDark = newVal as boolean)"
        size="large"
      >
        <template #active-action>
          <!-- 月亮 → 灰色填充 -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path
              fill="#9ca3af"
              d="M28.053 4.41c-5.47 1.427-9.508 6.4-9.508 12.317 0 7.03 5.699 12.727 12.728 12.727 5.916 0 10.89-4.037 12.316-9.507.27 1.309.411 2.665.411 4.053 0 11.046-8.954 20-20 20S4 35.046 4 24 12.954 4 24 4c1.389 0 2.744.141 4.053.41Z"
            />
          </svg>
        </template>
        <template #inactive-action>
          <!-- 太阳 → 黄色填充 -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path fill="#f59e0b" d="M24 37c7.18 0 13-5.82 13-13s-5.82-13-13-13-13 5.82-13 13 5.82 13 13 13Z" />
            <path
              fill="#f59e0b"
              d="M24 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM38.5 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM44.5 26.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM38.5 41a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM24 47a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9.5 41a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 26.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9.5 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
            />
          </svg>
        </template>
      </el-switch>
      <el-button class="mobile-menu-btn" icon="Menu" @click="emit('toggleMobileMenu')"></el-button>
      <div class="ml-auto login-btn flex items-center justify-center gap-2">
        <!-- 显隐 toggle：ThemeColorPicker 的 onClickOutside 已把 .theme-btn 列入白名单，不会先关后开 -->
        <div class="theme-btn iconfont icon-yanse-zhutise" @click="showColorPicker = !showColorPicker"></div>
        <!-- 角色信息：roleInfos 随登录信息加载实时更新（roleId + roleName，多角色顿号分隔） -->
        <span v-if="roleDisplay" class="role-info">{{ roleDisplay }}</span>
        <el-button v-if="!isLoggedIn" type="primary" @click="handleLogin"> 登录 </el-button>
        <el-button v-else type="danger" @click="handleLogout"> 退出登录 </el-button>
      </div>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { ElHeader } from 'element-plus';
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits<{
  (e: 'toggleMobileMenu'): void;
}>();

const showColorPicker = ref(false);

// isLoggedIn 为响应式 ref，登录/登出后模板自动更新
const { isLoggedIn, login, logout: authLogout } = useAuth();
function handleLogin(): void {
  login();
}

function handleLogout(): void {
  authLogout();
}

/**
 * 暗黑模式共享状态（useThemeDark，cookie 持久化）：
 * SSR 阶段服务端随请求 cookie 即知 light/dark，首屏 HTML 直接带正确的 dark 类，
 * 避免主题闪烁与水合不一致
 */
const isDark = useThemeDark();

// <html> 的 dark 类由 useHead 统一管理：服务端渲染输出 + 客户端切换时响应式更新
useHead({
  htmlAttrs: {
    class: computed(() => (isDark.value ? 'dark' : '')),
  },
});

// 角色展示文案：roleId + roleName（多角色顿号分隔），随 userInfo store 登录信息实时更新
const userInfoStore = useUserInfoStore();
const roleDisplay = computed(() =>
  userInfoStore.roleInfos.map((r) => `#${r.roleId ?? '-'} ${r.roleName ?? '-'}`).join('、'),
);

const headerRef = ref<InstanceType<typeof ElHeader> | null>(null);
const headerTop = ref(0);

onMounted(() => {
  // 组件实例存在，取 $el 原生DOM
  const dom = headerRef.value?.$el as HTMLElement | undefined;
  if (dom) {
    const rect = dom.getBoundingClientRect();
    const offsetTop = 10;
    headerTop.value = rect.bottom + offsetTop;
  }
});
</script>

<style scoped lang="scss">
:deep(.switchDark .el-switch__action) {
  background: transparent !important;
}

/* 头部导航内容行：等价于 flex items-center justify-between h-full gap-4 whitespace-nowrap overflow-hidden */
.el-header {
  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    gap: 1rem;
    white-space: nowrap;
    overflow: hidden;
  }
}

.theme-btn {
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 3rem;
  color: var(--el-color-primary);
}

.role-info {
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .el-header {
    padding: 0 0.75rem;
  }
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }
}

@media (min-width: 769px) {
  .mobile-menu-btn {
    display: none;
  }
}
</style>
