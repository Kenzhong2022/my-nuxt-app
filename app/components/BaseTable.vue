<script setup lang="ts" generic="T">
import { useSlots } from 'vue';
import type { FormItemRule } from 'element-plus';
import { ElTableColumn } from 'element-plus';
import { RefreshLeft, Search } from '@element-plus/icons-vue';
// ========== 类型定义 ==========
import type { ComponentProps } from 'vue-component-type-helpers';

export type ColumnConfig = Partial<ComponentProps<typeof ElTableColumn>> & {
  slotName?: string;
  headerSlotName?: string;
};


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
  // 列配置：el-table-column 全部可选 props + slotName/headerSlotName 扩展
  columns: ColumnConfig[];
  // 分页开关
  showPagination?: boolean;
  // 总记录数
  total?: number;
  // 变更时强制重渲染表格（default-expand-all 等仅初始化生效的属性需要）
  tableKey?: number | string;
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

// ========== 分页吸底阴影 ==========
const paginationSentinelRef = ref<HTMLElement | null>(null);
/** 分页是否处于吸附状态（true = 悬浮滚动中，显示上阴影） */
const isPaginationStuck = ref(false);

onMounted(() => {
  // 哨兵在视口内 = 分页已回到底部自然位置；视口外 = 正在吸附悬浮
  const sentinel = paginationSentinelRef.value;
  if (!sentinel || typeof IntersectionObserver === 'undefined') return;
  const io = new IntersectionObserver(([entry]) => {
    if(!entry) return
    isPaginationStuck.value = !entry.isIntersecting;
  });
  io.observe(sentinel);
});
</script>

<template>
  <div class="base-table-wrapper">
    <!-- 搜索栏区域：优先渲染自定义插槽 -->
    <div v-if="hasCustomSearchBar" class="search-bar">
      <slot name="search-bar" />
    </div>

    <!-- 默认筛选卡片（配置化表单，样式对齐 system/role 筛选区） -->
    <el-card v-else-if="renderDefaultSearchBar" class="filter-card" shadow="never">
      <el-form class="filter-form" :model="searchFormData" inline @submit.prevent="handleSearch">
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
        <el-form-item class="filter-form-operation">
          <el-button type="primary" :icon="Search" native-type="submit">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 + 分页 -->
    <div class="base-table">
      <!-- 工具栏插槽：标题 / 操作按钮等，位于表格上方 -->
      <slot name="toolbar" />
      <el-table ref="tableRef" :key="tableKey" v-bind="$attrs">
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

      <div
        v-if="showPagination !== false"
        class="pagination-container"
        :class="{ 'is-stuck': isPaginationStuck }"
      >
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
      <!-- 吸底哨兵：随文档流停在表格末尾。分页吸附时哨兵在视口外 → 加阴影；
           分页回到底部时哨兵进入视口 → 去阴影（IntersectionObserver 精确对应 stuck 状态） -->
      <div v-if="showPagination !== false" ref="paginationSentinelRef" class="pagination-sentinel" aria-hidden="true"></div>
    </div>
  </div>
</template>

<style scoped>
.base-table-wrapper {
  width: 100%;
}

/* 自定义插槽搜索栏 */
.search-bar {
  margin-bottom: 16px;
}

/* 筛选卡片（样式对齐 system/role 筛选区） */
.filter-card {
  margin-bottom: 16px;
  border-color: var(--el-border-color-lighter);
  border-radius: 8px;
}

/* 用 flex 接管换行与间距，避免 inline 表单自带 margin 造成的错位 */
.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}

.filter-form :deep(.el-form-item) {
  flex: none;
  margin: 0;
}

/* 分页吸底：sticky 相对滚动口吸附在底部，滚到父容器（.base-table）底边进入
   视口后自然回到文档流位置（长表格滚动时始终可见，表格尽头不再悬浮） */
.pagination-container {
  position: sticky;
  bottom: 0;
  z-index: 5;
  background: var(--el-bg-color);
  display: flex;
  justify-content: flex-end;
  padding: 12px 0;
}

/* 单侧阴影：贴在容器顶边，向下渐隐 */
.pagination-container::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  transform: translateY(-100%);
  height: 12px;
  pointer-events: none;

  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.1) 0%,
    transparent 100%
  );

  /* 默认隐藏：顶边裁掉全部 → 完全看不见 */
  clip-path: inset(100% 0 0 0);

  /* clip-path 过渡：隐藏 → 显示 从底边往上展开，
     显示 → 隐藏 从顶边往下收起（即“从上到下消失”） */
  transition: clip-path 0.2s linear;

  /* 提示浏览器对裁剪做合成层优化 */
  will-change: clip-path;
}

/* 吸附悬浮时显形 */
.pagination-container.is-stuck::before {
  clip-path: inset(0 0 0 0);
}
</style>
