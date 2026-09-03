<script setup lang="ts">
// 图片上传（按钮选择 / Ctrl+V 粘贴）→ 转 base64 data URL → el-image 预览
// 通过 v-model:image 双向绑定 base64 字符串；:disabled 由父级控制
const props = defineProps<{
  /** 当前图片 base64 data URL，空串表示无图 */
  image: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ (e: 'update:image', v: string): void }>();

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB 上限
const fileInput = ref<HTMLInputElement | null>(null);

/** 触发隐藏的 file input */
function pickImage() {
  fileInput.value?.click();
}

/** File → base64 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** 统一入口：校验类型/大小后转 base64 预览 */
async function acceptImage(file: File | null | undefined) {
  if (!file || props.disabled) return;
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('仅支持图片文件');
    return;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    ElMessage.warning('图片不能超过 10MB');
    return;
  }
  try {
    emit('update:image', await fileToBase64(file));
  } catch {
    ElMessage.error('图片读取失败，请重试');
  }
}

/** 按钮选择文件 */
function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  acceptImage(target.files?.[0]);
  // 允许重复选择同一张图：用完即清空 value
  target.value = '';
}

/** 移除已上传图片 */
function removeImage() {
  emit('update:image', '');
}

// Ctrl+V / Cmd+V 粘贴图片（截图直接粘贴），仅客户端监听
onMounted(() => {
  const onPaste = (e: ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items ?? []).find(
      (i) => i.type.startsWith('image/'),
    );
    if (item) {
      e.preventDefault();
      acceptImage(item.getAsFile());
    }
  };
  window.addEventListener('paste', onPaste);
  onUnmounted(() => window.removeEventListener('paste', onPaste));
});
</script>

<template>
  <!-- 已上传图片预览 -->
  <div v-if="image" class="upload-preview">
    <div class="preview-item">
      <el-image
        :src="image"
        alt="已上传图片"
        fit="cover"
        :preview-src-list="[image]"
        preview-teleported
        hide-on-click-modal
      />
      <el-button
        class="remove-btn"
        type="danger"
        icon="CircleCloseFilled"
        circle
        size="small"
        @click="removeImage"
      />
    </div>
    <span class="preview-tip">图片已就绪（Ctrl+V 可粘贴替换），点击图片可放大</span>
  </div>

  <!-- 触发按钮 + 隐藏 file input -->
  <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="onFileChange" />
  <el-button :disabled="disabled" @click="pickImage">上传图片</el-button>
</template>

<style scoped lang="scss">
// ===================== 图片上传预览 =====================
.hidden-input {
  display: none;
}
.upload-preview {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0.75rem 0;
}
.preview-item {
  position: relative;
  width: 7.5rem;
}
.preview-item :deep(.el-image) {
  display: block;
  width: 7.5rem;
  height: 7.5rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5rem;
  cursor: zoom-in;
}
.remove-btn {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
}
.preview-tip {
  font-size: var(--kk-font-size-extra-small);
  line-height: var(--kk-line-height-small);
  color: var(--el-text-color-secondary);
}
</style>
