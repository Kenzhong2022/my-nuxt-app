<template>
  <div class="prompt-card">
    <div class="card-header">
      <IconEye class="w-8 h-8" />
    </div>
    <div class="card-body">
      <h4>{{title}}</h4>
      <p>{{desc}}</p>
    </div>
    <div class="arrow">→</div>
  </div>
</template>

<script setup lang="ts">
import { IconEye } from '~/assets/svg'

const props = defineProps<{
  title: string
  desc: string
}>()
</script>

<style scoped lang="scss">
// ===================== 提示词卡片 =====================
.prompt-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--el-bg-color);
  padding: 0.875rem;
  border-radius: 0.75rem;
  text-align: left;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);

  .card-header {
    flex-shrink: 0;
  }

  .card-body {
    flex: 1;

    h4 {
      margin: 0;
      font-size: var(--kk-font-size-base);
    }

    p {
      margin: 0.25rem 0 0;
      font-size: var(--kk-font-size-extra-small);
      color: var(--el-text-color-secondary);
    }
  }
}
</style>