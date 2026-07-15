<template>
  <el-image
    :src="src"
    :preview-src-list="previewList"
    :show-progress="showProgress"
    :fit="fit"
    :class="className"
    @load="handleLoad"
    @error="handleError"
  >
    <!-- 加载中占位 -->
    <template #placeholder>
      <div class="image-slot placeholder">
        <el-icon class="is-loading"><Loading /></el-icon>
      </div>
    </template>

    <!-- 图片加载失败时显示的插槽 -->
    <template #error>
      <div class="image-slot error">
        <el-icon><Picture /></el-icon>
        <span>{{ errorText }}</span>
      </div>
    </template>

    <!-- 预览器中的错误插槽（可选） -->
    <template #viewer-error="{ activeIndex, src }">
      <div class="image-slot viewer-error">
        <el-icon><Picture /></el-icon>
        <span>{{ viewerErrorText }} ({{ activeIndex }})</span>
      </div>
    </template>
  </el-image>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src: string;
    previewList?: string[]; // 预览图片列表，不传则禁用预览
    showProgress?: boolean;
    fit?: "fill" | "contain" | "cover" | "none" | "scale-down";
    className?: string;
    errorText?: string; // 加载失败时显示的文本
    viewerErrorText?: string; // 预览加载失败时显示的文本
  }>(),
  {
    previewList: () => [],
    showProgress: false,
    fit: "cover",
    className: "",
    errorText: "加载失败",
    viewerErrorText: "预览加载失败",
  },
);

const emit = defineEmits<{
  (e: "load", event: Event): void;
  (e: "error", event: Event): void;
}>();

function handleLoad(event: Event) {
  emit("load", event);
}

function handleError(event: Event) {
  emit("error", event);
}
</script>

<style scoped>
.image-slot {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  min-height: 150px; /* 保证占位有高度 */
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.image-slot .el-icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.image-slot.placeholder .el-icon {
  font-size: 32px;
  color: var(--el-text-color-placeholder);
}

.image-slot.error {
  aspect-ratio: 1/1;
  background: #fafafa;
}

.viewer-error {
  background: #fff;
  color: #000;
}
</style>
