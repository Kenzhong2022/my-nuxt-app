<script setup lang="ts">
// 提示词查看弹窗：展示当前 System Prompt 并支持一键复制
import { useClipboard } from '@vueuse/core';

const props = defineProps<{
  visible: boolean;
  prompt: string;
}>();
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>();

const { copy, isSupported } = useClipboard();

async function copyPrompt() {
  if (!isSupported.value) {
    ElMessage.warning('当前浏览器不支持复制，请手动复制');
    return;
  }
  try {
    await copy(props.prompt);
    ElMessage.success('已复制');
  } catch {
    ElMessage.error('复制失败，请手动复制');
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="当前系统提示词（System Prompt）"
    width="720px"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <pre class="prompt-view">{{ prompt }}</pre>
    <template #footer>
      <el-button @click="copyPrompt">复制</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
// ===================== 提示词查看 =====================
.prompt-view {
  max-height: 60vh;
  padding: 0.75rem;
  margin: 0;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: var(--kk-font-size-extra-small);
  line-height: var(--kk-line-height-base);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--el-fill-color-light);
  border-radius: 0.375rem;
}
</style>
