<template>
  <div class="analytics-filter-bar">
    <div class="filter-group">
      <el-button ref="triggerBtnRef" @click="triggerDropdownMenu()">
        <div class="filter-btn">
          <div class="text-[var(--el-text-color-secondary)]">时间维度</div>
          <div class="text-[var(--el-text-color-primary)] ml-auto">
            {{ displayLabel }}
          </div>
          <div>
            <el-icon class="filter-icon"
              ><arrow-down v-if="dropdownVisible" />
              <arrow-up v-else />
            </el-icon>
          </div>
        </div>
      </el-button>

      <div
        v-if="dropdownVisible"
        class="filter-menu cursor-pointer"
        :style="{ left: menuLeft, top: menuTop }"
      >
        <div>
          <div
            class="filter-item"
            :class="{ active: item.value === curOption }"
            v-for="item in timeRangeOptions"
            :key="item.value"
            @click="onSelectOption(item.value)"
          >
            {{ item.label }}
          </div>
        </div>
        <div v-show="customOptionVisible" class="filter-item custom-option">
          <el-date-picker
            ref="customDatePickerRef"
            v-model="localCustomDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @calendar-change="onCalendarChange"
            @clear="onClear"
            :disabled-date="disabledDateFn"
            :editable="false"
          />
        </div>
      </div>
    </div>

    <el-button type="primary" class="export-btn" @click="onExport">
      导出
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type { ElButton, ElDatePicker } from "element-plus";
import { ArrowDown, Check, ArrowUp } from "@element-plus/icons-vue";

const props = withDefaults(
  defineProps<{
    timeRange?: string;
    customDate?: Date | null;
    customDateRange?: [Date, Date] | null;
    timeRangeOptions?: { label: string; value: string }[];
  }>(),
  {
    timeRange: "30d",
    customDate: null,
    timeRangeOptions: () => [
      { label: "近 7 天", value: "7d" },
      { label: "近 30 天", value: "30d" },
      { label: "近 90 天", value: "90d" },
      { label: "今年", value: "year" },
      { label: "自定义范围", value: "custom" },
    ],
  },
);

const emit = defineEmits<{
  "update:customDate": [value: Date | null];
  "update:timeRange": [value: string];
  "update:customDateRange": [value: [Date, Date] | null];
  export: [];
}>();

// ============ 响应式数据 ============
const customDatePickerRef = ref<HTMLDivElement | null>(null);
const triggerBtnRef = ref<InstanceType<typeof ElButton> | null>(null);
const customOptionVisible = ref<boolean>(false);
const dropdownVisible = ref(false);

/** 自定义日期范围响应式数据 */
const localCustomDateRange = computed({
  get: () => props.customDateRange,
  set: (val) => {
    if (!val) return;
    emit("update:customDateRange", val);
  },
});

/** 时间范围响应式数据 */
const localTimeRange = computed({
  get: () => props.timeRange,
  set: (val) => {
    if (!val) return;
    emit("update:timeRange", val);
  },
});

/** 显示标签响应式数据 */
const displayLabel = computed(() => {
  if (localCustomDateRange.value && localCustomDateRange.value.length >= 2) {
    return `${localCustomDateRange.value[0].toLocaleDateString()} 至 ${localCustomDateRange.value[1].toLocaleDateString()}`;
  }
  const item = props.timeRangeOptions.find(
    (i) => i.value === localTimeRange.value,
  );
  return item?.label ?? "选择时间范围";
});

// ============ 监听外部 prop 变化 ============
let cleanup: (() => void) | null = null;

watch(dropdownVisible, async (visible) => {
  if (visible) {
    await nextTick(); // 等待 DOM 更新（确保菜单已渲染，但触发按钮始终存在）
    updateMenuPosition();
    // 注册全局事件
    const handleUpdate = () => {
      if (!dropdownVisible.value) return;
      updateMenuPosition();
    };
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    cleanup = () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  } else {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
});

// 组件卸载时清理
onUnmounted(() => {
  if (cleanup) cleanup();
});

// ============ 方法 ============
// 记录用户点击的第一个日期
const selectedFirstDate = ref<Date | null>(null);
// 禁用日期函数
const disabledDateFn = (time: Date) => {
  // 没有基准日期时，不禁用任何日期
  if (!selectedFirstDate.value) return false;

  const base = new Date(selectedFirstDate.value);
  // 计算前后7天的日期（只比较日期部分，忽略具体时间）
  const minDate = new Date(base);
  minDate.setDate(base.getDate() - 7);
  const maxDate = new Date(base);
  maxDate.setDate(base.getDate() + 7);

  // 将待判断的日期转换为纯日期（忽略时间）
  const date = new Date(time);
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const minOnly = new Date(
    minDate.getFullYear(),
    minDate.getMonth(),
    minDate.getDate(),
  );
  const maxOnly = new Date(
    maxDate.getFullYear(),
    maxDate.getMonth(),
    maxDate.getDate(),
  );

  // 如果日期在范围外，则禁用
  return dateOnly < minOnly || dateOnly > maxOnly;
};

/** 日历选择变化 */
function onCalendarChange(val: any) {
  const [startDate, endDate] = val;
  selectedFirstDate.value = startDate;
  if (startDate && endDate) {
    // 隐藏下拉菜单
    triggerDropdownMenu(false);
  }
}

/** 清空选择 */
function onClear() {
  console.log("清空选择");
  selectedFirstDate.value = null;
  emit("update:customDateRange", null);
}

const menuLeft = ref("0px");
const menuTop = ref("0px");

function updateMenuPosition() {
  const btn = triggerBtnRef.value?.$el;
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  menuLeft.value = rect.left + "px";
  menuTop.value = rect.bottom + 4 + "px";
}
const curOption = ref("");
/** 选择选项 */
function onSelectOption(value: string) {
  curOption.value = value; // 可能是普通时间范围，也可能是自定义时间范围

  // 判断是不是自定义时间范围
  if (value !== "custom") {
    // 是普通时间范围
    triggerDropdownMenu(false);
    // 直接设置时间范围
    emit("update:timeRange", value);
    // 清空自定义时间范围
    emit("update:customDateRange", null);
  } else {
    customOptionVisible.value = true;
    // 清空普通时间范围
    emit("update:timeRange", "");
  }
}

/**
 * 控制下拉菜单的显示/隐藏
 * @param visible - 可选，true 打开，false 关闭，不传则切换当前状态
 */
async function triggerDropdownMenu(visible?: boolean): Promise<void> {
  if (visible === undefined) {
    // 未传参 → 切换
    dropdownVisible.value = !dropdownVisible.value;
    if (dropdownVisible.value && curOption.value === "custom") {
      await nextTick(); // 等待 DOM 更新
      customDatePickerRef.value?.focus();
    }
  } else {
    // 传了明确值（包括 false）→ 按传入值设置
    dropdownVisible.value = visible;
  }
}

function handleOpen() {
  triggerDropdownMenu(true);
}

function handleClose() {
  triggerDropdownMenu(false);
}

/** 导出 */
function onExport() {
  emit("export");
}

defineExpose({
  handleOpen,
  handleClose,
});
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
      position: fixed;
      display: flex;
      width: fit-content;
      font-size: 14px;
      background-color: var(--el-bg-color-overlay, #ccc);
      border: 1px solid var(--el-border-color);
      color: var(--el-text-color-primary);
      padding: 6px 8px;
      border-radius: 12px;
      z-index: 1000;
      white-space: nowrap;

      .filter-item {
        border-radius: 12px;
        padding: 12px 16px;
        &.active {
          color: var(--el-color-primary);
          background-color: var(--el-color-primary-light-9);
          font-weight: 600;
        }
        &:hover {
          background-color: var(--el-color-primary-light-5);
        }
      }

      .custom-option {
        border-radius: none;
      }

      .custom-option:hover {
        background-color: transparent;
      }
    }
  }

  .export-btn {
    border-radius: 20px;
    padding: 8px 24px;
    font-weight: 600;
  }
}
</style>
