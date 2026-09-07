<script setup lang="ts" generic="T">
import { useSlots } from 'vue';

// 搜索表单项类型
export type SearchFormItem = {
  label: string;
  prop: string;
  type: 'input' | 'select';
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
};

// showSearch 类型：布尔 / 搜索配置对象
type ShowSearchOption = boolean | { items: SearchFormItem[] };

const slots = useSlots();
const hasCustomSearchBar = !!slots['search-bar'];

const props = defineProps<{
  // 搜索栏开关/配置
  showSearch?: ShowSearchOption;
  columns: any[];
}>();

const emit = defineEmits<{
  search: [form: Record<string, any>];
  reset: [];
}>();

// 默认搜索表单数据
const defaultSearchForm = ref<Record<string, any>>({});

// 判断是否渲染默认搜索栏
const renderDefaultSearchBar = computed(() => {
  // 有自定义插槽，不渲染默认
  if (hasCustomSearchBar) return false;
  // showSearch为false，隐藏
  if (props.showSearch === false) return false;
  // true / 对象 渲染默认搜索栏
  return !!props.showSearch;
});
</script>

<template>
  <div class="base-table-wrapper">
    <!-- 搜索栏区域：优先渲染自定义插槽 -->
    <div v-if="hasCustomSearchBar || renderDefaultSearchBar" class="search-bar">
      <slot name="search-bar" />
      <!-- 没有自定义插槽，渲染内置搜索表单 -->
      <template v-if="renderDefaultSearchBar && !hasCustomSearchBar">
        <!-- 这里后续渲染默认搜索组件，input/select -->
        <el-input v-model="defaultSearchForm.keyword" placeholder="请输入搜索内容" clearable />
        <el-button type="primary" @click="emit('search', defaultSearchForm)">搜索</el-button>
        <el-button
          @click="
            defaultSearchForm.keyword = '';
            emit('reset');
          "
          >重置</el-button
        >
      </template>
    </div>

    <!-- 后面放 el-table、分页区域 -->
    <div class="base-table">
      <!-- 属性&事件全部透传给 el-table -->
      <el-table ref="tableRef" v-bind="$attrs">
        <template v-for="col in columns" :key="col.prop || col.type">
          <el-table-column v-bind="col">
            <!-- 自定义表头插槽：存在headerSlotName就渲染对应命名插槽 -->
            <template #header="headerScope">
              <slot v-if="col.headerSlotName" :name="col.headerSlotName" v-bind="headerScope" />
              <span v-else>{{ col.label }}</span>
            </template>

            <!-- 单元格插槽：存在slotName就渲染对应命名插槽，传入row/column/index -->
            <template #default="scope">
              <slot v-if="col.slotName" :name="col.slotName" v-bind="scope" />
            </template>
          </el-table-column>
        </template>
        <slot />
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.base-table-wrapper {
  width: 100%;
}
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
</style>
