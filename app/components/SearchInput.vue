<!-- components/SearchInput.vue -->
<template>
  <div class="border-b py-4 md:py-6 px-4">
    <div class="relative max-w-full md:max-w-5xl mx-auto">
      <el-input
        ref="searchInput"
        :model-value="modelValue"
        :placeholder="placeholder"
        @update:model-value="onInput"
        @focus="onFocus"
        @blur="onBlur"
      >
        <template v-if="$slots.prepend" #prepend>
          <slot name="prepend" />
        </template>
        <template v-if="$slots.append" #append>
          <slot name="append" />
        </template>
      </el-input>
      <!-- 联想词建议列表 -->
      <div
        v-if="showSuggestionsFlag"
        class="absolute left-0 right-0 top-full bg-white border border-solid border-gray-300 rounded-md shadow-lg z-10"
      >
        <div
          v-for="(item, idx) in props.suggestions || []"
          :key="item"
          class="p-2 hover:bg-gray-100 cursor-pointer"
          :class="currentIndex === idx ? 'bg-gray-100' : ''"
        >
          {{ item }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  debounce?: number; // 防抖延迟，默认 350ms
  suggestions?: string[]; // 联想词建议列表，默认空数组
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  search: [];
  "debounce-input": [value: string]; // 防抖后的输入值
  focus: []; // 输入框聚焦事件
  blur: []; // 输入框失去焦点事件
}>();

/**
 * 输入框聚焦事件处理
 */
const onFocus = () => {
  emit("focus");
  console.log("聚焦");
  // 输入框聚焦时，显示联想词建议列表
  showSuggestions();
};

/**
 * 输入框失去焦点事件处理
 */
const onBlur = () => {
  emit("blur");
  console.log("失去焦点");
  showSuggestionsFlag.value = false;
};

let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * 输入框输入事件处理
 * @param val 输入值
 */
const onInput = (val: string) => {
  if (!val) {
    // todo:展示历史搜索词
  }
  // 同步更新 v-model（输入实时响应）
  emit("update:modelValue", val);
  /**
   * 防抖处理逻辑
   * 首先清除之前的定时器，确保只有最新的输入值被处理。
   * 然后设置新的定时器，延迟 350ms 后触发 "debounce-input" 事件，传递当前输入值。
   * @param val 输入值
   * @returns 无
   */
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    emit("debounce-input", val);
  }, props.debounce ?? 350);
};
const currentIndex = ref(-1);

function handleKeyDown(e: KeyboardEvent) {
  const len = props.suggestions?.length ?? 0;
  // 无建议或建议列表未显示时，不处理方向键选中
  if (!showSuggestionsFlag.value || len === 0) {
    // 但 Enter 仍要执行搜索
    if (e.key === "Enter" && props.modelValue.trim()) {
      emit("search");
    }
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (currentIndex.value > 0) {
      currentIndex.value--;
    } else {
      currentIndex.value = len - 1; // 循环到末尾
    }
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (currentIndex.value < len - 1) {
      currentIndex.value++;
    } else {
      currentIndex.value = 0; // 循环到开头
    }
  } else if (e.key === "Enter") {
    if (currentIndex.value >= 0 && currentIndex.value < len) {
      const selected = props?.suggestions?.[currentIndex.value] ?? "";
      emit("update:modelValue", selected);
      currentIndex.value = -1;
      showSuggestionsFlag.value = false;
    } else if (props.modelValue.trim()) {
      emit("search");
    }
  }
}

// 建议列表变化时重置索引
watch(
  () => props.suggestions,
  () => {
    currentIndex.value = -1;
  },
);
onMounted(() => {
  document.addEventListener("keydown", handleKeyDown);
});

// 组件卸载时清理
onUnmounted(() => {
  if (timer) clearTimeout(timer);
  document.removeEventListener("keydown", handleKeyDown);
});
const showSuggestionsFlag = ref(false);

function showSuggestions() {
  showSuggestionsFlag.value = true;
}
</script>

<style scoped lang="scss">
.example-showcase .el-dropdown-link {
  cursor: pointer;
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
}
</style>
