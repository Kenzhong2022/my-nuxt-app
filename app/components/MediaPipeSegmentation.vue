<template>
  <div class="flex gap-4">
    <div>
      <h3>原视频</h3>
      <video
        ref="videoRef"
        src="/videos/demo5.mp4"
        loop
        muted
        playsinline
        style="width: 100%; max-width: 500px; border-radius: 8px"
        @error="handleVideoError"
      ></video>
    </div>
    <div>
      <h3>视频 + 弹幕（人物遮挡弹幕）</h3>
      <canvas
        ref="danmakuViewRef"
        style="
          width: 100%;
          max-width: 500px;
          border-radius: 8px;
          background: #eee;
        "
      ></canvas>
      <div v-if="errorMessage" style="color: #d32f2f; margin-top: 10px">
        ❌ {{ errorMessage }}
      </div>
      <p v-else-if="loading" style="color: #888">⏳ 模型加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ ssr: false });
import { ref, onMounted, onUnmounted } from "vue";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";
import { useMaskProcessor } from "@/composables/useMaskProcessor";
import { useDanmaku } from "@/composables/useDanmaku";

const {
  applyTemporalSmooth,
  drawMaskAntialiased,
  getMaskCanvas,
  fillInternalHoles,
  applyClosing,
} = useMaskProcessor();

const {
  addDanmakus,
  setMaskCanvas,
  render: renderDanmaku,
  dispose: disposeDanmaku,
} = useDanmaku();

function initDanmaku(canvasHeight: number): void {
  const samples = [
    "前方高能",
    "弹幕护体",
    "人物后面飘过",
    "背景区域可见",
    "masking 666",
    "只走背景不走人",
    "哈哈哈哈",
    "这效果厉害了",
  ];
  const colors = [
    "#ff4d4f",
    "#52c41a",
    "#1890ff",
    "#faad14",
    "#eb2f96",
    "#13c2c2",
  ];

  const danmakus = samples.map((text, i) => ({
    text: text,
    x: Math.random() * 500,
    y: 30 + (i % 8) * (canvasHeight / 9),
    speed: 1 + Math.random() * 2,
    color: colors[i % colors.length],
    fontSize: 28 + Math.floor(Math.random() * 8),
  }));

  addDanmakus(danmakus);
}

// ============ DOM 引用 ============
const videoRef = ref<HTMLVideoElement>();
let offscreenCanvas: HTMLCanvasElement | null = null;
const danmakuViewRef = ref<HTMLCanvasElement>();

// ============ 响应式状态 ============
const loading = ref<boolean>(true);
const errorMessage = ref<string>("");

// ============ 内部状态 ============
let segmenter: ImageSegmenter | null = null;
let animationId: number | null = null;
let lastTimestamp = -1;
// 多分类模型
const multiclassModelAssetPath =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

/**
 * 处理视频加载错误
 * @param event - 视频元素的错误事件对象
 */
const handleVideoError = (event: Event): void => {
  const video = videoRef.value;
  if (!video?.error) return;
  const codeMap: Record<number, string> = {
    1: "视频加载中断",
    2: "网络错误",
    3: "视频解码失败",
    4: "视频文件不存在或无法访问",
  };
  errorMessage.value =
    codeMap[video.error.code] || `视频错误: ${video.error.message}`;
};

/**
 * 初始化 MediaPipe 分割器
 * @returns Promise，解析时表示初始化完成
 */
async function initSegmenter(): Promise<void> {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
    );
    /**
     * 初始化 MediaPipe 分割器
     * @param vision - 视觉任务文件集
     * @returns Promise，解析时表示初始化完成
     */
    segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: multiclassModelAssetPath,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputCategoryMask: false, // 关闭二值掩码 0 是背景，1 是人物
      outputConfidenceMasks: true, // 开启连续置信度掩码 0 是背景，1 是人物
    });
    loading.value = false;
  } catch (err) {
    console.error(err);
    errorMessage.value = "模型加载失败，请检查网络";
    loading.value = false;
  }
}

let personMask: Float32Array | null = null;
let binaryMask: Float32Array | null = null;

/**
 * 处理单帧视频：分割、生成掩码并绘制到 Canvas
 * 由 requestAnimationFrame 循环驱动
 */
function processFrame(offscreenCanvas: HTMLCanvasElement): void {
  const video = videoRef.value;
  if (!video || !offscreenCanvas || !segmenter) {
    animationId = requestAnimationFrame(() => processFrame(offscreenCanvas));
    return;
  }

  if (video.readyState < 2 || video.paused) {
    animationId = requestAnimationFrame(() => processFrame(offscreenCanvas));
    return;
  }

  const timestampMs = video.currentTime * 1000;
  if (timestampMs <= lastTimestamp) {
    animationId = requestAnimationFrame(() => processFrame(offscreenCanvas));
    return;
  }
  lastTimestamp = timestampMs;

  try {
    const result = segmenter.segmentForVideo(video, timestampMs);

    const firstMask = result.confidenceMasks?.[0];
    if (!firstMask) {
      result.close?.();
      animationId = requestAnimationFrame(() => processFrame(offscreenCanvas));
      return;
    }

    const w = firstMask.width;
    const h = firstMask.height;
    const size = w * h;

    // 复用 personMask 数组，避免每帧分配
    if (!personMask || personMask.length !== size) {
      personMask = new Float32Array(size);
    }
    personMask.fill(0);

    // 多分类掩码合并（忽略背景索引0）
    for (let idx = 1; idx <= 5; idx++) {
      const mask = result.confidenceMasks?.[idx];
      if (!mask) continue;
      const data = mask.getAsFloat32Array();
      if (idx === 1) {
        personMask.set(data);
      } else {
        for (let i = 0; i < data.length; i++) {
          if (data[i] > personMask[i]) personMask[i] = data[i];
        }
      }
      mask.close?.();
    }

    // 可选：时序平滑（按需开启）
    // personMask = applyTemporalSmooth(personMask);

    // 复用 binaryMask 数组，用于二值化
    if (!binaryMask || binaryMask.length !== size) {
      binaryMask = new Float32Array(size);
    }
    for (let i = 0; i < size; i++) {
      binaryMask[i] = (personMask[i] ?? 0) > 0.1 ? 1 : 0;
    }

    // 已移除闭运算和孔洞填充以提升性能，若需要可酌情低频调用
    // binaryMask = applyClosing(binaryMask, w, h);
    // const filledMask = fillInternalHoles(binaryMask, w, h);

    const displayW = video.videoWidth || video.clientWidth || 500;
    const displayH = video.videoHeight || video.clientHeight || 500;

    // 将二值掩码渲染到离屏 Canvas（用于后续弹幕裁剪）
    drawMaskAntialiased(binaryMask, w, h, offscreenCanvas, displayW, displayH);

    // 弹幕合成：先画视频，再叠加上裁剪后的弹幕层
    const danmakuView = danmakuViewRef.value;
    if (danmakuView) {
      const dCtx = danmakuView.getContext("2d")!;
      dCtx.drawImage(video, 0, 0, displayW, displayH);
      renderDanmaku(dCtx, displayW, displayH);
    }

    // 释放 MediaPipe 资源
    firstMask.close?.();
    result.close?.();
  } catch (err) {
    console.error("帧处理错误:", err);
  }

  animationId = requestAnimationFrame(() => processFrame(offscreenCanvas));
}

// ============ 生命周期 ============

/**
 * 组件挂载：初始化分割器，等待视频加载后开始处理
 */
onMounted(async (): Promise<void> => {
  await initSegmenter(); // 初始化分割器
  const video = videoRef.value;
  if (!video) {
    errorMessage.value = "视频元素未找到";
    return;
  }
  const start = (): void => {
    const w = video.videoWidth || 500;
    const h = video.videoHeight || 500;
    danmakuViewRef.value!.width = w;
    danmakuViewRef.value!.height = h;

    // 创建一个离屏 canvas，专门给 drawMaskAntialiased 用
    offscreenCanvas = document.createElement("canvas");

    initDanmaku(h);
    setMaskCanvas(getMaskCanvas());
    lastTimestamp = -1;
    if (segmenter && !errorMessage.value) {
      video.play().catch(() => {});
      // 把离屏 canvas 传入 processFrame 或直接在闭包中引用
      processFrame(offscreenCanvas);
    }
  };
  if (video.readyState >= 2) {
    start();
  } else {
    video.addEventListener("loadeddata", start, { once: true }); // 视频加载完成后开始处理帧，不需要重复监听
  }
});

/**
 * 组件卸载：清理动画帧、分割器资源
 */
onUnmounted((): void => {
  if (animationId) cancelAnimationFrame(animationId); // 取消动画帧
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
