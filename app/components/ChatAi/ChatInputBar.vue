<template>
  <div class="input-bar">
    <!-- 已上传图片缩略图（可放大 / 移除） -->
    <div v-if="image" class="image-preview">
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
          :icon="CircleCloseFilled"
          circle
          size="small"
          @click="image = ''"
        />
      </div>
    </div>

    <!-- 输入区（卡片内无边框） -->
    <el-input
      v-model="text"
      type="textarea"
      :rows="2"
      resize="none"
      placeholder="想聊点什么…"
      class="chat-textarea"
    />

    <!-- 底部工具栏：左侧功能按钮 / 右侧模型选择 + 发送 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-tooltip content="上传图片" placement="top">
          <el-button :icon="Picture" text circle @click="fileInput?.click()" />
        </el-tooltip>
        <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="onFileChange" />
      </div>

      <div class="toolbar-right">
        <el-select placement="top" v-model="modelId" filterable placeholder="选择模型" class="model-select">
          <el-option v-for="m in chatModels" :key="m.name" :label="m.name" :value="m.name">
            <div class="model-option">
              <img
                v-if="m.logo && !failedLogos.has(m.logo)"
                :src="m.logo"
                :alt="m.author"
                crossorigin="anonymous"
                class="model-logo"
                @error="failedLogos.add(m.logo!)"
              />
              <el-icon v-else class="model-logo-fallback"><Cpu /></el-icon>
              <span class="model-name">{{ m.name }}</span>
              <span class="model-author">{{ m.author }}</span>
              <el-tag v-for="b in m.badges" :key="b" size="small" :type="badgeUi(b).tag" effect="plain">
                {{ badgeUi(b).label }}
              </el-tag>
            </div>
          </el-option>
        </el-select>
        <el-button type="primary" circle @click="emit('send')">
          <IconSend class="w-4 h-4" />
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconSend } from '~/assets/svg'
import { Picture, CircleCloseFilled } from '@element-plus/icons-vue'
// 模型筛选参考 pages/llmModels/components/ModelFilterSelect 的实现
import { BADGE_UI, CHAT_TASKS } from '../../pages/llmModels/constants/chat'
import type { LlmModel, LlmModelBadge, LlmModelCatalog } from '~~/types/llmModel'

// 输入文本 / 上传图片（base64）/ 选中模型名（LlmModel.name），均支持父级 v-model 绑定
const text = defineModel<string>('text', { default: '' })
const image = defineModel<string>('image', { default: '' })
const modelId = defineModel<string>('modelId', { default: '' })

const emit = defineEmits<{ send: [] }>()

// ===================== 模型选择 =====================
const catalog = ref<LlmModelCatalog | null>(null)
const badgeUi = (b: LlmModelBadge) => BADGE_UI.find((x) => x.key === b)!

// 加载失败的 logo URL 集合（COEP/防盗链等被拦截时），命中则显示图标兜底
const failedLogos = ref(new Set<string>())

onMounted(async () => {
  catalog.value = await $fetch<LlmModelCatalog>('/allModels/llm-modules.json')
})

/** 对话可用模型（文本生成 / 图生文），平铺各任务分组 */
const chatModels = computed<LlmModel[]>(
  () => catalog.value?.taskTypes.flatMap((g) => g.models).filter((m) => CHAT_TASKS.includes(m.taskType)) ?? [],
)

// 目录加载后若未选模型则默认选第一个（同 ModelFilterSelect 的自动选中逻辑）
watch(chatModels, (list) => {
  if (list.length && !list.some((m) => m.name === modelId.value)) {
    modelId.value = list[0]?.name ?? ''
  }
})

// ===================== 图片上传（file → base64 预览） =====================
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB 上限
const fileInput = ref<HTMLInputElement | null>(null)

/** File → base64 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = '' // 允许重复选择同一张图
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('仅支持图片文件')
    return
  }
  if (file.size > MAX_IMAGE_SIZE) {
    ElMessage.warning('图片不能超过 10MB')
    return
  }
  try {
    image.value = await fileToBase64(file)
  } catch {
    ElMessage.error('图片读取失败，请重试')
  }
}
</script>

<style scoped lang="scss">
// ===================== 输入栏卡片 =====================
.input-bar {
  padding: 0.75rem 0.875rem 0.5rem;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 1.25rem;
  box-shadow: var(--el-box-shadow-light);
}

// 输入区：卡片内无边框
.chat-textarea :deep(.el-textarea__inner) {
  padding: 0.25rem 0.25rem 0.5rem;
  background: transparent;
  box-shadow: none;
}

// ===================== 底部工具栏 =====================
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.model-select {
  width: 11rem;
}

// ===================== 图片上传预览 =====================
.hidden-input {
  display: none;
}
.image-preview {
  margin-bottom: 0.5rem;
}
.preview-item {
  position: relative;
  width: 5rem;
}
.preview-item :deep(.el-image) {
  display: block;
  width: 5rem;
  height: 5rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5rem;
  cursor: zoom-in;
}
.remove-btn {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
}

// ===================== 模型选项（同 ModelFilterSelect） =====================
.model-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
// 厂商 logo（同 ModelFilterSelect 的 author-logo），无 logo 时用 Cpu 图标兜底
.model-logo {
  height: 1rem;
  max-width: 4rem;
  object-fit: contain;
}
.model-logo-fallback {
  flex-shrink: 0;
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
}
.model-name {
  font-size: var(--kk-font-size-small);
  font-weight: 600;
}
.model-author {
  font-size: var(--kk-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

// ===================== 手机端适配（≤768px） =====================
@media (max-width: 768px) {
  // 模型选择器缩窄，优先保证发送按钮可见
  .model-select {
    width: 7.5rem;
  }
}
</style>
