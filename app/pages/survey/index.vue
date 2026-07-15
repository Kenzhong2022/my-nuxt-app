<template>
  <div>
    <header class="survey-header">
      <div class="header-left">
        <div>
          <i
            class="iconfont icon-home"
            @click="() => navigateTo('/')"
            :style="{ fontSize: '36px', color: 'var(--el-color-primary)' }"
          />
        </div>
        <h1>问卷设计</h1>
      </div>
      <div class="header-right">
        <el-button
          :type="mode === 'write' ? 'primary' : 'default'"
          @click="toggleTrialMode"
        >
          {{ mode === "write" ? "退出试答" : "试答" }}
        </el-button>
        <el-button type="default" @click="publishSurvey">发布并分享</el-button>
      </div>
    </header>
    <SurveyDesigner ref="surveyDesignerRef" :mode="mode" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import SurveyDesigner from "./components/SurveyDesigner.vue";

definePageMeta({ layout: false });
const surveyDesignerRef = ref<InstanceType<typeof SurveyDesigner>>();

const mode = ref<"edit" | "write">("edit");

const toggleTrialMode = throttle(() => {
  const valid = validateSurvey();
  if (!valid) {
    return;
  }
  mode.value = mode.value === "edit" ? "write" : "edit";
}, 50);

function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 500,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// 节流
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 500,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...arg: Parameters<T>): void => {
    if (timer) {
      return;
    }
    timer = setTimeout(() => {
      // delay秒后调用func
      func(...arg);
      timer = null;
    }, delay);
  };
}

function goHome() {
  navigateTo({ name: "home" });
}

function publishSurvey() {
  const valid = validateSurvey();
  if (!valid) {
    return;
  }
}

function validateSurvey(): boolean {
  if (!surveyDesignerRef.value) {
    ElMessage.error("问卷设计器未初始化");
    return false;
  }
  const survey = surveyDesignerRef.value?.getSurvey();
  if (survey.questions.length === 0) {
    ElMessage.warning("请至少添加一个问卷问题");
    return false;
  }
  return true;
}
</script>

<style scoped lang="scss">
.survey-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  box-shadow: 0 1px 4px var(--el-box-shadow-lighter);
}
.header-left {
  flex-grow: 1;
  display: flex;
  align-items: center;
  h1 {
    margin: 0 auto;
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    display: flex;
  }
}
.header-right {
  display: flex;
  gap: 12px;
}
</style>
