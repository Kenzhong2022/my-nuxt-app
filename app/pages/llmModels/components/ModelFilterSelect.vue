<script setup lang="ts">
// 模型筛选选择器：加载 llm-modules.json 目录 → 任务类型/厂商/徽标三级级联过滤 → 选择模型
// 通过 v-model:modelId 双向绑定当前选中的模型名（LlmModel.name）
import { LlmTaskType } from '~~/types/llmModel';
import type { LlmModel, LlmModelBadge, LlmModelCatalog } from '~~/types/llmModel';
import { BADGE_UI } from '../constants/chat';

const props = defineProps<{
  /** 当前选中模型名（LlmModel.name），空串表示未选 */
  modelId: string;
  /** 需要标注"适用"的任务类型集合（如 CHAT_TASKS） */
  appliesTasks: readonly LlmTaskType[];
  /** 适用时的标签文案 */
  appliesLabel: string;
}>();
const emit = defineEmits<{ (e: 'update:modelId', v: string): void }>();

/** 模型目录（所有模型）*/
const catalog = ref<LlmModelCatalog | null>(null);

onMounted(async () => {
  catalog.value = await $fetch<LlmModelCatalog>('/allModels/llm-modules.json');
});

const badgeUi = (b: LlmModelBadge) => BADGE_UI.find((x) => x.key === b)!;

// 三级筛选条件（'' / 空数组 = 不限）
const taskFilter = ref<LlmTaskType | ''>('');
const authorFilter = ref('');
const badgeFilter = ref<LlmModelBadge[]>([]);

// JSON 结构：{ taskTypes: [{ taskType, models: [...] }] }，models 在每个分组内，顶层没有
const allModels = computed<LlmModel[]>(
  () => catalog.value?.taskTypes.flatMap((g) => g.models) ?? [],
);

/** 任务类型选项（带数量，按数量降序） */
const taskTypeOptions = computed(() => {
  const counter = new Map<LlmTaskType, number>();
  for (const m of allModels.value) counter.set(m.taskType, (counter.get(m.taskType) ?? 0) + 1);
  return [...counter].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
});

/** 厂商选项（跟随任务类型级联缩小）；logo 取该厂商任一模型的（优先取有的），无则不显示 */
const authorOptions = computed(() => {
  const pool = taskFilter.value ? allModels.value.filter((m) => m.taskType === taskFilter.value) : allModels.value;
  const map = new Map<string, string | null>();
  for (const m of pool) {
    if (!map.has(m.author)) {
      map.set(m.author, m.logo ?? null);
    } else if (!map.get(m.author) && m.logo) {
      map.set(m.author, m.logo);
    }
  }
  return [...map.entries()]
    .map(([author, logo]) => ({ author, logo }))
    .sort((a, b) => a.author.localeCompare(b.author));
});

const filteredModels = computed(() =>
  allModels.value.filter(
    (m) =>
      (!taskFilter.value || m.taskType === taskFilter.value) &&
      (!authorFilter.value || m.author === authorFilter.value) &&
      (badgeFilter.value.length === 0 || badgeFilter.value.every((b) => m.badges.includes(b))),
  ),
);

const selectedModel = computed(
  () => filteredModels.value.find((m) => m.name === props.modelId) ?? null,
);

/** 当前选中模型是否适用于目标动作 */
const applies = computed(() => {
  if (!selectedModel.value) return null;
  return props.appliesTasks.includes(selectedModel.value.taskType);
});

// 筛选结果变化后，若已选模型被过滤掉则自动选第一个
watch(
  filteredModels,
  (list) => {
    if (!selectedModel.value) emit('update:modelId', list.length && list[0] ? list[0].name : '');
  },
  { immediate: true },
);
</script>

<template>
  <div class="model-filter">
    <div class="filter-row">
      <el-select v-model="taskFilter" clearable placeholder="任务类型（全部）" class="f-task">
        <el-option v-for="o in taskTypeOptions" :key="o.label" :label="`${o.label}（${o.count}）`" :value="o.label" />
      </el-select>
      <el-select v-model="authorFilter" clearable placeholder="厂商（全部）" class="f-author">
        <el-option v-for="o in authorOptions" :key="o.author" :label="o.author" :value="o.author">
          <div class="author-option">
            <span>{{ o.author }}</span>
            <img v-if="o.logo" :src="o.logo" :alt="o.author" class="author-logo" />
          </div>
        </el-option>
      </el-select>
      <el-select v-model="badgeFilter" multiple collapse-tags clearable placeholder="徽标（任选，需同时满足）" class="f-badge">
        <el-option v-for="b in BADGE_UI" :key="b.key" :label="b.label" :value="b.key" />
      </el-select>
    </div>

    <el-select
      :model-value="modelId"
      filterable
      placeholder="选择模型"
      class="f-model"
      @update:model-value="emit('update:modelId', $event)"
    >
      <el-option v-for="m in filteredModels" :key="m.name" :label="m.name" :value="m.name">
        <div class="model-option">
          <span class="model-name">{{ m.name }}</span>
          <span class="model-author">{{ m.author }}</span>
          <el-tag v-for="b in m.badges" :key="b" size="small" :type="badgeUi(b).tag" effect="plain">
            {{ badgeUi(b).label }}
          </el-tag>
        </div>
      </el-option>
    </el-select>

    <div v-if="selectedModel" class="model-meta">
      筛选出 {{ filteredModels.length }} / {{ allModels.length }} 个模型 · 当前
      <b>{{ selectedModel.name }}</b>（{{ selectedModel.author }}）
      <el-tag v-if="applies" size="small" type="success" class="meta-tag">{{ appliesLabel }}</el-tag>
      <el-tag v-else size="small" type="info" class="meta-tag">不适用本页动作（走默认模型）</el-tag>
    </div>
    <div v-else class="model-meta">没有匹配的模型，请调整筛选条件</div>
  </div>
</template>

<style scoped lang="scss">
// ===================== 模型筛选 =====================
.model-filter {
  margin: 0.75rem 0;
}
.filter-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.f-task {
  flex: 2;
}
.f-author {
  flex: 1.5;
}
.f-badge {
  flex: 2;
}
.f-model {
  width: 100%;
}
.model-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.model-name {
  font-size: var(--kk-font-size-small);
  font-weight: 600;
}
.model-author {
  font-size: var(--kk-font-size-extra-small);
  color: var(--el-text-color-secondary);
}
.author-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.author-logo {
  height: 1rem;
  max-width: 4rem;
  object-fit: contain;
}
.model-meta {
  margin-top: 0.5rem;
  font-size: var(--kk-font-size-small);
  line-height: var(--kk-line-height-small);
  color: var(--el-text-color-secondary);
}
.meta-tag {
  margin-left: 0.5rem;
}
</style>
