<script setup lang="ts" generic="T">
import { useSlots } from 'vue';
import type { FormItemRule } from 'element-plus';
// ========== 类型定义 ==========
export type SearchFormItem = {
  label: string; // 表单项标签
  prop: string; // 字段名，绑定到表单数据对象
  type: 'input' | 'select' | 'date' | 'daterange' | 'number' | 'textarea';
  placeholder?: string;
  options?: Array<{ label: string; value: any }>; // select 选项
  attrs?: Record<string, any>; // 额外属性，如 clearable, style, 等
  rules?: FormItemRule[]; // 校验规则
  default?: any; // 自定义默认值
};

// showSearch 类型：布尔 / 搜索配置对象
type ShowSearchOption = boolean | { items: SearchFormItem[] };

const slots = useSlots();
const hasCustomSearchBar = !!slots['search-bar'];

// 属性透传给 el-table，避免重复落在根节点上
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  // 搜索栏开关/配置
  showSearch?: ShowSearchOption;
  columns: any[];
  // 分页开关
  showPagination?: boolean;
  // 总记录数
  total?: number;
}>();

// 分页双向绑定：父组件使用 v-model:current-page / v-model:page-size
const currentPage = defineModel<number>('currentPage');
const pageSize = defineModel<number>('pageSize');

const emit = defineEmits<{
  /** 分页变化，通知父组件重新拉取数据 */
  fetch: [];
  search: [form: Record<string, any>];
  reset: [];
}>();

// ========== 搜索栏配置处理 ==========
// 默认配置（当 showSearch 为 true 且未提供 items 时使用）
const DEFAULT_ITEMS: SearchFormItem[] = [
  { label: '', prop: 'keyword', type: 'input', placeholder: '搜索商品名称 / 标题' },
];

// 获取有效的搜索配置项
const searchItems = computed<SearchFormItem[]>(() => {
  if (typeof props.showSearch === 'object' && props.showSearch?.items) {
    return props.showSearch.items;
  }
  if (props.showSearch === true) {
    return DEFAULT_ITEMS;
  }
  return [];
});

// 判断是否渲染默认搜索栏（无自定义插槽且有有效配置）
const renderDefaultSearchBar = computed(() => {
  if (hasCustomSearchBar) return false;
  if (props.showSearch === false) return false;
  return searchItems.value.length > 0;
});

// 表单数据模型（响应式对象）
const searchFormData = ref<Record<string, any>>({});

const getDefaultValue = (item: SearchFormItem): any => {
  // 如果配置了 default，优先使用
  if (item.default !== undefined) {
    return item.default;
  }
  // 根据类型返回合理的默认值
  switch (item.type) {
    case 'number':
      return undefined; // 或 null
    case 'date':
      return null;
    case 'daterange':
      return [];
    case 'input':
    case 'textarea':
    case 'select':
    default:
      return '';
  }
};

const initFormData = (items: SearchFormItem[]) => {
  const data: Record<string, any> = {};
  items.forEach((item) => {
    data[item.prop] = getDefaultValue(item);
  });
  return data;
};

// 监听 items 变化，重新初始化数据（并保留已有值？为了安全，完全重置）
watchEffect(() => {
  const items = searchItems.value;
  if (items.length) {
    // 获取当前表单数据，用于保留用户已输入的值（但字段可能变化，简单重置）
    // 这里完全重置，你也可以选择保留匹配的字段
    searchFormData.value = initFormData(items);
  }
});

// ========== 搜索 & 重置 ==========
function handleSearch() {
  currentPage.value = 1; // 搜索后默认返回第一页
  const filteredData = removeEmptyValues(searchFormData.value);
  console.log(filteredData);
  emit('search', filteredData);
}

function handleReset() {
  // 清空所有字段
  const items = searchItems.value;
  const emptyData = initFormData(items);
  searchFormData.value = emptyData;
  // 触发 reset 事件
  emit('reset');
  // 重置后重新请求数据
  emit('fetch');
}

// ========== 数据请求 ==========
/** 分页变化时通知父组件重新拉取数据 */
function emitFetch() {
  emit('fetch');
}

// ========== 分页 ==========
/** 页大小变化：回到第一页；若已在第一页则直接重新请求 */
function onPageSizeChange() {
  if (currentPage.value === 1) {
    emitFetch();
  } else {
    currentPage.value = 1; // 页码变更会触发 current-change → emitFetch
  }
}

// 暴露给父组件调用（如 list.vue 的重置按钮）
defineExpose({ handleReset });
</script>

<template>
  <div class="base-table-wrapper">
    <!-- 搜索栏区域：优先渲染自定义插槽 -->
    <div v-if="hasCustomSearchBar || renderDefaultSearchBar" class="search-bar">
      <slot name="search-bar" />
      <!-- 默认搜索栏（配置化表单） -->
      <template v-if="renderDefaultSearchBar && !hasCustomSearchBar">
        <el-form :inline="true" :model="searchFormData" @submit.native.prevent="handleSearch" class="search-form">
          <el-form-item
            v-for="field in searchItems"
            :key="field.prop"
            :label="field.label"
            :label-width="field.label ? 'auto' : '0'"
            :rules="field.rules || []"
            :prop="field.prop"
          >
            <!-- 输入框 -->
            <el-input
              v-if="field.type === 'input'"
              v-model="searchFormData[field.prop]"
              :placeholder="field.placeholder"
              clearable
              v-bind="field.attrs || {}"
            />
            <!-- 数字输入 -->
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="searchFormData[field.prop]"
              :placeholder="field.placeholder"
              controls-position="right"
              v-bind="field.attrs || {}"
            />
            <!-- 文本域 -->
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="searchFormData[field.prop]"
              :placeholder="field.placeholder"
              type="textarea"
              :rows="2"
              v-bind="field.attrs || {}"
            />
            <!-- 下拉选择 -->
            <el-select
              v-else-if="field.type === 'select'"
              v-model="searchFormData[field.prop]"
              :placeholder="field.placeholder"
              clearable
              v-bind="field.attrs || {}"
            >
              <el-option v-for="opt in field.options || []" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <!-- 日期选择器（单日期） -->
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="searchFormData[field.prop]"
              :placeholder="field.placeholder"
              type="date"
              value-format="YYYY-MM-DD"
              v-bind="field.attrs || {}"
            />
            <!-- 日期范围 -->
            <el-date-picker
              v-else-if="field.type === 'daterange'"
              v-model="searchFormData[field.prop]"
              :placeholder="field.placeholder || '开始日期 ~ 结束日期'"
              type="daterange"
              range-separator="~"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              v-bind="field.attrs || {}"
            />
            <!-- 其他类型可继续扩展 -->
          </el-form-item>

          <!-- 操作按钮 -->
          <el-form-item class="search-form-operation">
            <el-button type="primary" native-type="submit">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </template>
    </div>

    <!-- 表格 + 分页 -->
    <div class="base-table">
      <el-table ref="tableRef" v-bind="$attrs">
        <template v-for="col in columns" :key="col.prop || col.type">
          <el-table-column v-bind="col">
            <template #header="headerScope">
              <slot v-if="col.headerSlotName" :name="col.headerSlotName" v-bind="headerScope" />
              <span v-else>{{ col.label }}</span>
            </template>
            <template #default="scope">
              <slot v-if="col.slotName" :name="col.slotName" v-bind="scope" />
            </template>
          </el-table-column>
        </template>
        <slot />
      </el-table>

      <div v-if="showPagination !== false" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="emitFetch"
          @size-change="onPageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.base-table-wrapper {
  width: 100%;
}
.search-bar {
  margin-bottom: 16px;
}
.search-form {
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  .search-form-operation {
    margin-left: auto;
  }
}
.search-form :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
