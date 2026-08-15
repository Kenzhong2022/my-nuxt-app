<template>
  <!-- 左右布局：左采集，右渲染 -->
  <div class="split-view">
    <div class="edit-panel">
      <h3>原始采集</h3>
      <div
        class="video-container"
        :style="{
          width: CAPTURE_SIZE.width + 'px',
          height: CAPTURE_SIZE.height + 'px',
        }"
        v-custom-loading="cameraLoading"
      >
        <video v-if="isCameraOn" ref="videoRef" autoplay playsinline muted />
        <div v-else class="video-placeholder">
          <el-icon :size="48" color="#c0c4cc"><VideoCamera /></el-icon>
          <p>摄像头未开启</p>
        </div>
      </div>
      <el-button
        size="large"
        :type="isCameraOn ? 'danger' : 'primary'"
        @click="toggleCamera"
      >
        <div
          class="iconfont"
          :class="isCameraOn ? 'icon-tingzhi' : 'icon-open'"
          :style="{ fontSize: '32px' }"
        ></div>
        {{ isCameraOn ? "关闭摄像头" : "开启摄像头" }}
      </el-button>
      <!-- 控制栏 -->
      <div class="control-panel">
        <el-select
          v-model="selectedIndex"
          @change="applyPreset"
          placeholder="选择渲染尺寸"
          style="width: 240px"
          :disabled="!isCameraOn"
        >
          <el-option
            v-for="(opt, idx) in presets"
            :key="idx"
            :label="opt.label"
            :value="idx"
          />
        </el-select>
      </div>
    </div>
    <div class="render-panel">
      <div>
        <h3>渲染结果（抠图）</h3>
        <canvas ref="canvasRef" :class="{ 'canvas-hidden': !isCameraOn }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "TestMatting",
});
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { useDanmaku } from "~/composables/useDanmaku";

const videoLoading = ref(true);
const isCameraOn = ref(false);
const cameraLoading = ref(false);

// ========== 固定采集尺寸 ==========
const CAPTURE_SIZE = { width: 256, height: 256 };

// ========== 渲染尺寸预设 ==========
const presets = [
  { label: "256 × 256", render: { width: 256, height: 256 } },
  { label: "512 × 512", render: { width: 512, height: 512 } },
  { label: "1024 × 1024", render: { width: 1024, height: 1024 } },
  { label: "2048 × 2048", render: { width: 2048, height: 2048 } },
];

// ---------- 弹幕相关 ----------
const {
  addDanmakus,
  setMaskCanvas,
  render: renderDanmaku,
  dispose: disposeDanmaku,
} = useDanmaku();

const videoRef = ref<HTMLVideoElement>();
const canvasRef = ref<HTMLCanvasElement>();
const selectedIndex = ref(1); // 默认 512×512

let currentStream: MediaStream | null = null;
let segmenter: any = null;
let segmenterPromise: Promise<void> | null = null;

// 蒙版画布（存储置信度灰度图，白色人物，黑色背景，Alpha 通道供碰撞检测使用）
let maskCanvas: HTMLCanvasElement = document.createElement("canvas");
let maskCtx: CanvasRenderingContext2D | null = null;
let maskImageData: ImageData | null = null;

let animationFrameId = 0;

// 当前渲染尺寸
let renderWidth = 0;
let renderHeight = 0;

// 初始化采集（仅一次）
async function initCapture() {
  if (!videoRef.value) {
    throw new Error("Video element not available");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: CAPTURE_SIZE.width,
      height: CAPTURE_SIZE.height,
      facingMode: "user",
    },
  });
  currentStream = stream;
  videoRef.value.srcObject = stream;
  await videoRef.value.play();

  await new Promise<void>((resolve) => {
    if (videoRef.value!.videoWidth > 0 && videoRef.value!.videoHeight > 0) {
      resolve();
    } else {
      videoRef.value!.addEventListener("loadedmetadata", () => resolve(), {
        once: true,
      });
    }
  });

  const capW = videoRef.value!.videoWidth;
  const capH = videoRef.value!.videoHeight;
  console.log(`实际采集分辨率: ${capW} x ${capH}`);

  // 设置离屏蒙版画布（采集尺寸）
  maskCanvas.width = capW;
  maskCanvas.height = capH;
  maskCtx = maskCanvas.getContext("2d")!;
  maskImageData = maskCtx.createImageData(capW, capH);
}

async function toggleCamera() {
  if (isCameraOn.value) {
    stopCamera();
    return;
  }

  cameraLoading.value = true;
  videoLoading.value = true;

  try {
    // 1. 先标记为开启，让视频元素渲染
    isCameraOn.value = true;
    await nextTick();

    // 2. 初始化视频采集（等摄像头就绪）
    await initCapture();

    // 3. 确保分割模型已加载（如果 onMounted 预加载未完成，这里阻塞等待）
    await initSegmenter();

    // 4. 应用渲染尺寸
    applyPreset();

    // 5. 同步蒙版画布给弹幕模块（此时 maskCanvas 已有真实采集尺寸）
    setMaskCanvas(maskCanvas);

    // 6. 【关键】视频 + 模型 双就绪后，才关闭 loading
    videoLoading.value = false;

    // 7. 启动渲染循环（此时 segmenter 一定存在，不会空转）
    processFrame();
  } catch (err: any) {
    // 出现错误时关闭 loading，并回退状态
    videoLoading.value = false;
    isCameraOn.value = false;
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
    handleCameraError(err);
  } finally {
    cameraLoading.value = false;
  }
}

function stopCamera() {
  isCameraOn.value = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }
  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function handleCameraError(err: any) {
  console.error("摄像头启动失败:", err);
  if (
    err?.name === "NotAllowedError" ||
    err?.name === "PermissionDeniedError"
  ) {
    ElMessage?.error(
      "摄像头权限被拒绝，请在浏览器地址栏的站点设置中允许访问摄像头",
    );
  } else if (
    err?.name === "NotFoundError" ||
    err?.name === "DevicesNotFoundError"
  ) {
    ElMessage?.error("未检测到摄像头设备");
  } else if (
    err?.name === "NotReadableError" ||
    err?.name === "TrackStartError"
  ) {
    ElMessage?.error("摄像头被其他程序占用，请关闭占用程序后重试");
  } else if (err?.name === "OverconstrainedError") {
    ElMessage?.error("摄像头不支持当前请求的分辨率");
  } else {
    ElMessage?.error("无法访问摄像头，请检查设备连接");
  }
}

// 应用新的渲染尺寸
function applyRenderSize(renderSize: { width: number; height: number }) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  renderWidth = renderSize.width;
  renderHeight = renderSize.height;
  canvas.width = renderWidth;
  canvas.height = renderHeight;
}

// 切换预设（只改渲染尺寸，不重启采集）
function applyPreset() {
  const preset = presets[selectedIndex.value];
  if (!preset?.render) return console.error("无效的渲染尺寸预设");
  applyRenderSize(preset.render);
}

// 加载分割器（幂等：已加载则直接返回，加载中则等待）
async function initSegmenter() {
  if (segmenter) return;
  if (segmenterPromise) return segmenterPromise;

  segmenterPromise = (async () => {
    const { ImageSegmenter, FilesetResolver } =
      await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    );
    segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
      },
      runningMode: "VIDEO",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  })();

  return segmenterPromise;
}

// 渲染循环
function processFrame() {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  // 【关键】不再检查 segmenter，由 toggleCamera 保证其已就绪
  if (!video || !canvas || !maskCtx || !maskImageData) {
    animationFrameId = requestAnimationFrame(processFrame);
    return;
  }

  const capW = maskCanvas.width;
  const capH = maskCanvas.height;

  const timestampMs = performance.now();
  const result = segmenter.segmentForVideo(video, timestampMs);
  const mask = result.confidenceMasks?.[0];

  if (!mask) {
    result.close();
    animationFrameId = requestAnimationFrame(processFrame);
    return;
  }

  try {
    const confidence = mask.getAsUint8Array();
    const arr = maskImageData.data;
    const len = capW * capH;
    for (let i = 0; i < len; i++) {
      const j = i * 4;
      arr[j + 3] = confidence[i];
    }
    maskCtx.putImageData(maskImageData, 0, 0);

    const ctx = canvas.getContext("2d")!;
    // 等比缩放裁剪（确保不变形）
    const capRatio = capW / capH;
    const renRatio = renderWidth / renderHeight;
    let sx = 0,
      sy = 0,
      sw = capW,
      sh = capH;

    if (capRatio > renRatio) {
      sw = capH * renRatio;
      sx = (capW - sw) / 2;
    } else if (capRatio < renRatio) {
      sh = capW / renRatio;
      sy = (capH - sh) / 2;
    }

    // ----- 1. 主画布绘制视频（等比缩放裁剪） -----
    ctx.clearRect(0, 0, renderWidth, renderHeight);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, renderWidth, renderHeight);

    // ----- 2. 弹幕碰撞检测：避开人物区域（使用与视频相同的裁剪参数） -----
    renderDanmaku(ctx, renderWidth, renderHeight, { sx, sy, sw, sh });
  } finally {
    mask.close();
    result.close();
  }

  animationFrameId = requestAnimationFrame(processFrame);
}

// 初始化示例弹幕
function initDanmaku() {
  const items = [
    {
      text: "🎉 欢迎来到直播间",
      x: 0,
      y: 40,
      speed: 2,
      color: "#ffffff",
      fontSize: 28,
    },
    {
      text: "这个抠图效果真棒！",
      x: 200,
      y: 100,
      speed: 1.5,
      color: "#ffdd44",
      fontSize: 24,
    },
    {
      text: "MediaPipe 太强了",
      x: 400,
      y: 160,
      speed: 2.5,
      color: "#ff66aa",
      fontSize: 26,
    },
    {
      text: "一键三连！",
      x: 600,
      y: 220,
      speed: 1.8,
      color: "#66ccff",
      fontSize: 22,
    },
  ];
  addDanmakus(items);
}

onMounted(async () => {
  try {
    // 预加载模型（不阻塞，失败也不影响，toggleCamera 会兜底重试）
    initSegmenter().catch(() => {});

    // 初始化 canvas 尺寸
    applyPreset();

    // 初始化弹幕数据
    initDanmaku();
  } finally {
    // 初始页面加载完成，但摄像头未开启，无需 loading
    videoLoading.value = false;
  }
});

onUnmounted(() => {
  stopCamera();
  if (segmenter) {
    try {
      segmenter.close();
    } catch (e) {
      // ignore
    }
  }
  disposeDanmaku();
});
</script>

<style scoped lang="scss">
.split-view {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  height: inherit;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 20px;
}
.edit-panel {
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: start;
  gap: 20px;
  height: 100%;
  border-radius: inherit;
  .video-container {
    border-radius: inherit;
    overflow: hidden;
  }
}
.render-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: inherit;
  border: 1px solid var(--el-border-color);
  border-radius: inherit;
}
video,
canvas {
  max-width: 100%;
  height: auto;
}
.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 14px;
  p {
    margin-top: 8px;
  }
}
.canvas-hidden {
  visibility: hidden;
}
</style>
