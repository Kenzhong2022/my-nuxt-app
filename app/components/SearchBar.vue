<!-- components/SearchBar.vue -->
<template>
  <SearchInput
    v-model="searchQuery"
    :placeholder="currentPlaceholder"
    :suggestions="props.suggestions || []"
    @debounce-input="onDebounceInput"
    @search="handleSearch"
  >
    <template #prepend>
      <el-select v-model="searchMode" style="width: 80px">
        <el-option
          v-for="item in options"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </template>
    <template #append>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
    </template>
  </SearchInput>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import SearchInput from "./SearchInput.vue";

const props = defineProps<{
  options?: { label: string; value: string }[];
  placeholderTemplate?: string;
  suggestions?: string[]; // 联想词建议列表，默认空数组
}>();

const emit = defineEmits<{
  search: [{ query: string; mode: string }];
  fetchSuggestions: [{ query: string }];
}>();

const searchQuery = ref("");
const searchMode = ref(props.options?.[0]?.value || "");

/**
 * 计算当前占位符
 * @returns 当前占位符字符串
 */
const currentPlaceholder = computed(() => {
  const label =
    props.options?.find((o) => o.value === searchMode.value)?.label || "";
  return (props.placeholderTemplate || "搜索{type}...").replace(
    "{type}",
    label,
  );
});

// 防抖触发：350ms 后打印
const onDebounceInput = (val: string) => {
  console.log("防抖输入:", val);
  // 发送联想词建议请求
  if (val) {
    emit("fetchSuggestions", {
      query: val,
    });
  }
};

const handleSearch = () => {
  emit("search", {
    query: searchQuery.value.trim(),
    mode: searchMode.value,
  });
};
</script>
