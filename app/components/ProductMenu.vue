<template>
  <div class="project-menu-col">
    <div
      v-for="card in cardList"
      :key="card.id"
      class="project-card cursor-pointer"
      @click="card.action"
    >
      <div class="glass-card">
        <div class="card-title">{{ card.title }}</div>
        <div class="card-desc">{{ card.description }}</div>
        <div class="card-btn">
          <span class="btn-text">{{ card.buttonText }}</span>
          <el-icon class="btn-icon"><ArrowRightBold /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import { ArrowRightBold } from "@element-plus/icons-vue";

interface CardConfig {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  action: () => void;
}
const props = defineProps({
  cardList: {
    type: Array as PropType<CardConfig[]>,
    default: () => [],
  },
});
</script>

<style scoped lang="scss">
.project-menu-col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  overflow: hidden;

  .project-card {
    height: 300px;
    overflow: hidden;
  }

  .glass-card {
    width: 100%;
    height: 100%;
    padding: 36px;
    background: rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
    color: #ffffff;
    font-family: system-ui, sans-serif;

    /* 垂直弹性布局，按钮固定底部 */
    display: flex;
    flex-direction: column;

    .card-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .card-desc {
      flex: 1;
      font-size: 15px;
      line-height: 1.7;
      opacity: 0.8;
      margin-bottom: 24px;
      /* 超长文本自动换行 */
      word-break: break-all;
    }

    .card-btn {
      display: flex;
      align-items: center;
      gap: 8px;

      .btn-text {
        font-size: 16px;
        font-weight: 500;
      }

      .btn-icon {
        font-size: 18px;
      }
    }
  }
}
</style>
