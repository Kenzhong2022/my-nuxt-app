<template>
  <div class="chat-input-container" :style="{ boxShadow: shadowStyle }">
    <div
      class="flex items-center justify-start mb-[8px] overflow-hidden"
      :style="{ height: 'fit-content' }"
    >
      <div
        v-for="(item, index) in inputImagesBase64"
        :key="item"
        class="mr-[12px]"
      >
        <div
          class="h-[120px] w-[120px] overflow-hidden rounded-lg image-slot relative"
        >
          <ImageWithFallback
            :src="item"
            fit="fill"
            class="w-full h-full"
            :preview-src-list="inputImagesBase64"
            errorText="加载失败"
            viewerErrorText="预览加载失败"
          />
          <div class="delete-btn" @click="removeImage(index)">×</div>
        </div>
      </div>
    </div>
    <textarea
      v-model="inputText"
      placeholder="给 DeepSeek 发送消息"
      class="message-input"
      @focus="handleFocus"
      @blur="handleBlur"
      @paste="handlePaste"
    ></textarea>

    <div class="action-bar">
      <div class="action-buttons">
        <el-button
          :type="activeButton === 'plain' ? 'primary' : ''"
          plain
          round
          @click="activeButton = 'plain'"
          size="large"
          >深度思考</el-button
        >
        <el-button
          :type="activeButton === 'primary' ? 'primary' : ''"
          plain
          round
          @click="activeButton = 'primary'"
          size="large"
          >智能搜索</el-button
        >
      </div>
      <div
        @click="handleClick"
        class="send-btn flex items-center justify-center"
      >
        <i v-if="!sendLoading" class="iconfont icon-fasong text-[36px]"></i>
        <i v-else class="iconfont icon-tingzhi" style="font-size: 36px"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
// 新增：缓存粘贴的原始图片File对象（上传必需）
const pendingImageFiles = ref<File[]>([]);
// 新增：上传加载状态，防止重复点击发送
const sendLoading = ref(false);
// 新增：固定会话ID（对接后端thread_id参数）
const THREAD_ID = "1";
const inputImagesBase64 = ref<string[]>([]);
const inputText = ref("");
const activeButton = ref("");
const isFocused = ref(false);

const shadowStyle = computed(() => {
  const color = isFocused.value
    ? "rgba(59, 130, 246, 0.5)"
    : "rgba(0, 0, 0, 0.3)";
  return `0 0px 4px ${color}`;
});

function handleFocus() {
  isFocused.value = true;
}

function handleBlur() {
  isFocused.value = false;
}

const { batchUploadImages } = useCloudinaryUpload();
const emit = defineEmits(["send", "pauseSend"]);

function handleClick() {
  if (!sendLoading.value) {
    onSend();
  } else {
    pauseSend();
  }
}

async function onSend() {
  sendLoading.value = true;
  const files = pendingImageFiles.value;
  let urls: string[] = [];
  if (files.length) {
    urls = await batchUploadImages(files);
    console.log("上传完成链接", urls);
  }
  if (!inputText.value.trim()) return;
  emit("send", {
    thread_id: THREAD_ID,
    prompt: inputText.value,
    image: urls[0],
  });
  inputText.value = "";
}

function pauseSend() {
  sendLoading.value = false;
  emit("pauseSend");
}

function removeImage(index: number) {
  inputImagesBase64.value.splice(index, 1);
  pendingImageFiles.value.splice(index, 1);
}

function handlePaste(e: ClipboardEvent) {
  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  // 处理粘贴内容
  const items = clipboardData.items;
  console.log("=== 粘贴内容 ===");

  for (const item of items) {
    if (item.type.indexOf("text") !== -1) {
      item.getAsString((text) => {
        console.log("文本内容：", text);
      });
    } else if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (!file) continue;

      // 优化1：前端限制单图最大5MB，提前拦截超大文件
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        console.warn(`图片${file.name}超过5MB，已忽略`);
        continue;
      }

      // 优化2：简单去重（对比文件名+大小，避免重复缓存）
      const isDuplicate = pendingImageFiles.value.some(
        (f) => f.name === file.name && f.size === file.size,
      );
      if (isDuplicate) continue;

      pendingImageFiles.value.push(file);

      const reader = new FileReader();
      // 优化3：捕获文件读取失败（损坏图片、解析失败）
      reader.onerror = () => {
        console.error(`图片${file.name}解析失败，跳过预览`);
        // 读取失败同步移除缓存，避免上传空文件
        const idx = pendingImageFiles.value.findIndex((f) => f === file);
        if (idx > -1) pendingImageFiles.value.splice(idx, 1);
      };

      // 优化4：ev.target 增加安全判断，消除强制类型断言风险
      reader.onload = (ev) => {
        const base64Url = ev.target?.result;
        if (typeof base64Url === "string") {
          inputImagesBase64.value.push(base64Url);
        }
      };

      reader.readAsDataURL(file);
    } else {
      const file = item.getAsFile();
      if (file) {
        console.log(
          "其他文件：",
          file.name,
          "类型：",
          file.type,
          "大小：",
          file.size,
          "字节",
        );
      }
    }
  }
}
</script>

<style lang="scss">
.chat-input-container {
  width: 70%;
  background: white;
  border-radius: 16px;
  border: 1px solid var(--color-border-light);
  padding: 16px;
  margin: 0 auto;
  .image-slot {
    position: relative;

    .delete-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      color: white;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.2s;
    }

    &:hover .delete-btn {
      opacity: 1;
    }
  }
}

.message-input {
  width: 100%;
  min-height: 80px;
  resize: none;
  outline: none;
  color: var(--color-gray-700);
  font-size: 18px;
  border: none;
  background: transparent;
  &::placeholder {
    color: var(--color-gray-300);
  }
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  border: none;
  font-size: 24px;
  transition: background-color 0.2s;
  &:hover {
    background: rgba(174, 187, 243, 0.8);
  }
}
</style>
