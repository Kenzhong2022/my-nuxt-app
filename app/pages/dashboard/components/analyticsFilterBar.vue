<template>
  <div class="analytics-filter-bar">
    <div class="filter-group">
      <el-button @click="dropdownVisible = !dropdownVisible">
        <div class="filter-btn">
          <div class="text-[var(--el-text-color-secondary)]">时间维度</div>
          <div class="text-[var(--el-text-color-primary)] ml-auto">
            {{ displayLabel }}
          </div>
          <div>
            <el-icon class="filter-icon"><arrow-down /></el-icon>
          </div>
        </div>
      </el-button>

      <div v-if="dropdownVisible" class="filter-menu cursor-pointer">
        <div
          v-for="item in timeRangeOptions"
          :key="item.value"
          class="filter-item"
        >
          {{ item.label }}
        </div>
      </div>
    </div>

    <el-button type="primary" class="export-btn" @click="onExport">
      导出
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ArrowDown, Check } from "@element-plus/icons-vue";

const props = withDefaults(
  defineProps<{
    timeRange?: string;
    timeRangeOptions?: { label: string; value: string }[];
  }>(),
  {
    timeRange: "30d",
    timeRangeOptions: () => [
      { label: "近 7 天", value: "7d" },
      { label: "近 30 天", value: "30d" },
      { label: "近 90 天", value: "90d" },
      { label: "今年", value: "year" },
    ],
  },
);

const emit = defineEmits<{
  "update:timeRange": [value: string];
  export: [];
}>();

// ============ 响应式数据 ============
const dropdownRef = ref<any>(null);
const dropdownMenuRef = ref<any>(null);
const localTimeRange = ref(props.timeRange);
const isCustomActive = ref(false);
const showCustomPanel = ref(false);
const dropdownVisible = ref(false);

// 显示标签
const displayLabel = computed(() => {
  if (isCustomActive.value) {
    return "自定义范围";
  }
  const item = props.timeRangeOptions.find(
    (i) => i.value === localTimeRange.value,
  );
  return item?.label ?? "选择时间范围";
});

// ============ 监听外部 prop 变化 ============
watch(
  () => props.timeRange,
  (val) => {
    if (val !== "custom") {
      localTimeRange.value = val;
      isCustomActive.value = false;
      showCustomPanel.value = false;
    }
  },
);

// ============ 方法 ============

/** 选择预设选项 */
function onSelectPreset(value: string) {
  console.log("选择预设", value);
  isCustomActive.value = false;
  showCustomPanel.value = false;
  localTimeRange.value = value;
  emit("update:timeRange", value);
  // 选择预设后自动关闭
  dropdownRef.value?.handleClose();
}

/** 下拉菜单可见性变化 */
function onVisibleChange(visible: boolean) {}

/** 更新下拉菜单可见性 */
function updateDropdownVisible(visible: boolean) {
  console.log("更新下拉菜单可见性", visible);
  dropdownVisible.value = visible;
}

/** 导出 */
function onExport() {
  emit("export");
}
</script>

<style scoped lang="scss">
.analytics-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .filter-group {
    position: relative;

    .filter-btn {
      flex-grow: 1;
      display: flex;
      align-items: center;
      min-width: 180px;
      justify-content: flex-start;
      gap: 8px;
    }

    .filter-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      width: fit-content;
      font-size: 14px;
      background-color: var(--el-bg-color-overlay, #ccc);
      border: 1px solid var(--el-border-color);
      color: var(--el-text-color-primary);
      padding: 6px 8px;
      border-radius: 12px;
      z-index: 1000;
      .filter-item {
        padding: 12px 16px;
      }
      .filter-item:hover {
        border-radius: inherit;
        background-color: var(--el-color-primary-light-5);
      }
    }
  }

  .export-btn {
    border-radius: 20px;
    padding: 8px 24px;
    font-weight: 600;
  }
}

// 下拉菜单样式
:deep(.filter-dropdown-menu) {
  min-width: 200px;
  padding: 6px 0;

  .el-dropdown-menu__item {
    line-height: 36px;
    padding: 0 16px;
    font-size: 14px;

    &.active {
      color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
      font-weight: 600;
    }

    &:hover {
      background-color: var(--el-fill-color-light);
    }
  }

  .custom-trigger-item {
    padding: 0;

    &:hover {
      background-color: var(--el-fill-color-light);
    }
  }

  .custom-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 16px;
    line-height: 36px;

    .check-icon {
      color: var(--el-color-primary);
      font-size: 14px;
    }
  }

  .custom-panel {
    border-top: 1px solid var(--el-border-color-lighter);
    padding: 12px 16px;
    background-color: var(--el-fill-color-light);
  }
}
</style>
