<template>
  <div class="survey-designer">
    <div class="mobile-header">
      <el-button
        icon="Menu"
        class="mobile-btn"
        @click="showComponentDrawer = true"
        >组件库</el-button
      >
      <span class="mobile-title">问卷设计</span>
      <el-button
        icon="Setting"
        class="mobile-btn"
        @click="showConfigDrawer = true"
        >配置</el-button
      >
    </div>

    <div v-show="props.mode !== 'write'" class="left-panel">
      <ComponentPanel @add="addQuestion" />
    </div>
    <div :class="['middle-panel', { 'full-width': props.mode === 'write' }]">
      <PreviewArea
        :title="survey.title"
        :questions="survey.questions"
        :selected-id="selectedId"
        :mode="props.mode"
        @update:questions="updateQuestions"
        @select="selectQuestion"
        @remove="removeQuestion"
      />
    </div>
    <div v-show="props.mode !== 'write'" class="right-panel">
      <ConfigPanel
        :questions="survey.questions"
        v-model:question="currentQuestion"
      />
    </div>

    <el-drawer
      v-model="showComponentDrawer"
      title="组件库"
      direction="ltr"
      size="240px"
    >
      <ComponentPanel @add="addQuestion" />
    </el-drawer>
    <el-drawer
      v-model="showConfigDrawer"
      title="属性配置"
      direction="rtl"
      size="320px"
    >
      <ConfigPanel
        :questions="survey.questions"
        v-model:question="currentQuestion"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import ComponentPanel from "./ComponentPanel.vue";
import PreviewArea from "./PreviewArea.vue";
import ConfigPanel from "./ConfigPanel.vue";
import { componentMetaList } from "../config/componentMeta";
import type {
  Survey as SurveyType,
  Question,
  QuestionType,
} from "~~/types/survey";

const props = defineProps<{
  mode?: "edit" | "write";
}>();

const showComponentDrawer = ref(false);
const showConfigDrawer = ref(false);

// 问卷数据
const survey = ref<SurveyType>({
  id: "survey_" + Date.now(),
  title: "我的问卷标题",
  description: "我的问卷描述",
  questions: [
    {
      id: "question_" + Date.now(),
      type: "input",
      label: "问题1",
      placeholder: "请输入",
      required: true,
      defaultValue: "",
      options: [],
      props: {},
      sort: 0,
    },
  ],
  status: "draft",
});

// 当前选中的问题ID
const selectedId = ref<string>("");

// 当前选中的问题对象（可写）
const currentQuestion = computed<Question | null>({
  get: () => {
    return (
      survey.value.questions.find((q) => q.id === selectedId.value) || null
    );
  },
  set: (updated) => {
    if (updated) {
      const idx = survey.value.questions.findIndex((q) => q.id === updated.id);
      if (idx > -1) {
        survey.value.questions[idx] = updated;
      }
    }
  },
});

/**
 * 添加表单项
 * @param type 表单项类型
 */
function addQuestion(type: QuestionType) {
  const meta = componentMetaList.find((m) => m.type === type);
  if (!meta) return;
  //
  const defaultValue =
    meta.defaultConfig.defaultValue !== undefined
      ? meta.defaultConfig.defaultValue
      : "";
  const newQuestion: Question = {
    id: "question_" + Date.now(),
    type,
    label: meta.label,
    placeholder: meta.defaultConfig.placeholder || "",
    required: meta.defaultConfig.required ?? false,
    defaultValue,
    value: Array.isArray(defaultValue) ? [...defaultValue] : defaultValue,
    options: meta.defaultConfig.options ? [...meta.defaultConfig.options] : [],
    props: meta.defaultConfig.props ? { ...meta.defaultConfig.props } : {},
    sort: survey.value.questions.length,
  };
  survey.value.questions.push(newQuestion);
  selectedId.value = newQuestion.id;
}

// 更新问题列表（拖拽排序后）
function updateQuestions(newQuestions: Question[]) {
  survey.value.questions = newQuestions;
}

// 选择问题
function selectQuestion(id: string) {
  selectedId.value = id;
}

// 删除问题
function removeQuestion(id: string) {
  const idx = survey.value.questions.findIndex((q) => q.id === id);
  if (idx > -1) {
    survey.value.questions.splice(idx, 1);
    if (selectedId.value === id) {
      selectedId.value = "";
    }
  }
}

function getSurvey() {
  return survey.value;
}

defineExpose({
  getSurvey,
});
</script>

<style scoped>
.survey-designer {
  display: flex;
  height: 100vh;
  background: var(--el-bg-color-page);
}
.mobile-header {
  display: none;
}
.left-panel {
  width: 200px;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  padding: 16px;
  overflow-y: auto;
}
.middle-panel {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.middle-panel.full-width {
  width: 100%;
}
.right-panel {
  width: 320px;
  background: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color-light);
  padding: 16px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .survey-designer {
    flex-direction: column;
    height: calc(100vh - 60px);
  }
  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-light);
  }
  .mobile-btn {
    padding: 8px;
  }
  .mobile-title {
    font-size: 16px;
    font-weight: 600;
  }
  .left-panel {
    display: none;
  }
  .right-panel {
    display: none;
  }
  .middle-panel {
    flex: 1;
    padding: 12px;
    width: 100%;
  }
}
</style>
