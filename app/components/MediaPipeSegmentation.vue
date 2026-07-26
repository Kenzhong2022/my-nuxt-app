<template>
  <div class="grid grid-col-2 gap-4">
    <div>
      <h3>原视频</h3>
      <video
        ref="videoRef"
        src="/videos/demo5.mp4"
        autoplay
        loop
        muted
        playsinline
        style="width: 100%; max-width: 500px; border-radius: 8px"
        @error="handleVideoError"
      ></video>
    </div>
    <div>
      <h3>抠图效果（人物黑色）</h3>
      <canvas
        ref="canvasRef"
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
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ ssr: false });
import { ref, onMounted, onUnmounted } from "vue";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

// 组件顶层复用，避免每帧创建
const maskCanvas = document.createElement("canvas");
const danmakuLayerCanvas = document.createElement("canvas");
const bgMaskCanvas = document.createElement("canvas");

interface DanmakuItem {
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
  fontSize: number;
}

let danmakuList: DanmakuItem[] = [];

/**
 * 初始化示例弹幕
 * @param canvasHeight - 画布高度，用于分布弹幕垂直位置
 */
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

  danmakuList = samples.map((text, i) => ({
    text: text || "",
    x: Math.random() * 500 || 0,
    y: 30 + (i % 8) * (canvasHeight / 9) || 0,
    speed: 1 + Math.random() * 2 || 0,
    color: colors[i % colors.length] || "",
    fontSize: 28 + Math.floor(Math.random() * 8) || 0,
  }));
}

/**
 * 更新弹幕位置并在指定上下文绘制
 * @param ctx - 绘制上下文
 * @param width - 画布宽度
 * @param height - 画布高度
 */
function updateAndDrawDanmaku(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = "top";

  danmakuList.forEach((item) => {
    ctx.font = `bold ${item.fontSize}px sans-serif`;
    const textWidth = ctx.measureText(item.text).width;

    item.x += item.speed;
    if (item.x > width) {
      item.x = -textWidth;
      item.y = 20 + Math.random() * (height - 40);
    }

    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x, item.y);
    ctx.shadowBlur = 0;
  });
}

/**
 * 使用人物掩码裁剪弹幕后合成到目标画布
 * 原理：弹幕画在透明离屏画布，再用背景掩码（人物透明、背景不透明）做 destination-in 裁剪
 * @param targetCanvas - 要叠加弹幕的目标画布
 * @param displayW - 显示宽度
 * @param displayH - 显示高度
 */
function drawDanmakuOverlay(
  targetCanvas: HTMLCanvasElement,
  displayW: number,
  displayH: number,
): void {
  if (!danmakuList.length) {
    initDanmaku(displayH);
  }

  if (
    danmakuLayerCanvas.width !== displayW ||
    danmakuLayerCanvas.height !== displayH
  ) {
    danmakuLayerCanvas.width = displayW;
    danmakuLayerCanvas.height = displayH;
  }
  if (bgMaskCanvas.width !== displayW || bgMaskCanvas.height !== displayH) {
    bgMaskCanvas.width = displayW;
    bgMaskCanvas.height = displayH;
  }

  const dCtx = danmakuLayerCanvas.getContext("2d")!;
  updateAndDrawDanmaku(dCtx, displayW, displayH);

  // 生成背景掩码：白色背景（Alpha=255），人物区域按掩码透明度扣空
  const bgCtx = bgMaskCanvas.getContext("2d")!;
  bgCtx.globalCompositeOperation = "source-over";
  bgCtx.fillStyle = "white";
  bgCtx.fillRect(0, 0, displayW, displayH);

  bgCtx.globalCompositeOperation = "destination-out";
  bgCtx.drawImage(maskCanvas, 0, 0, displayW, displayH);
  bgCtx.globalCompositeOperation = "source-over";

  // 用背景掩码裁剪弹幕：只保留背景区域
  dCtx.globalCompositeOperation = "destination-in";
  dCtx.drawImage(bgMaskCanvas, 0, 0, displayW, displayH);
  dCtx.globalCompositeOperation = "source-over";

  const targetCtx = targetCanvas.getContext("2d")!;
  targetCtx.drawImage(danmakuLayerCanvas, 0, 0, displayW, displayH);
}

/**
 * 将低分辨率 mask 抗锯齿绘制到目标 canvas，并执行闭运算补全孔洞
 * 原理：
 *   1. 二值化置信度掩码（阈值 0.3）
 *   2. 3x3 闭运算：先膨胀后腐蚀，填充内部孔洞，闭合断裂
 *   3. 生成 Alpha 通道（人物黑色，背景透明）
 *   4. 利用 GPU 双线性插值放大到显示尺寸，消除锯齿
 */
function drawMaskAntialiased(
  maskData: Float32Array,
  maskW: number,
  maskH: number,
  targetCanvas: HTMLCanvasElement,
  displayW: number,
  displayH: number,
): void {
  // ── 1. 二值化 ──
  const threshold = 0.3;
  const binary = new Uint8Array(maskData.length);
  for (let i = 0; i < maskData.length; i++) {
    binary[i] = maskData[i] > threshold ? 1 : 0;
  }

  // ── 2. 闭运算（膨胀 + 腐蚀） ──
  const kernelSize = 3; // 3x3 结构元素
  const half = Math.floor(kernelSize / 2);

  // 2a. 膨胀
  const dilated = new Uint8Array(binary.length);
  for (let y = 0; y < maskH; y++) {
    for (let x = 0; x < maskW; x++) {
      const idx = y * maskW + x;
      if (binary[idx] === 1) {
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < maskH && nx >= 0 && nx < maskW) {
              dilated[ny * maskW + nx] = 1;
            }
          }
        }
      }
    }
  }

  // 2b. 腐蚀
  const closed = new Uint8Array(binary.length);
  for (let y = 0; y < maskH; y++) {
    for (let x = 0; x < maskW; x++) {
      let allOne = true;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (
            ny < 0 ||
            ny >= maskH ||
            nx < 0 ||
            nx >= maskW ||
            dilated[ny * maskW + nx] === 0
          ) {
            allOne = false;
            break;
          }
        }
        if (!allOne) break;
      }
      if (allOne) {
        closed[y * maskW + x] = 1;
      }
    }
  }

  // ── 3. 写入 ImageData（人物黑色，背景透明） ──
  maskCanvas.width = maskW;
  maskCanvas.height = maskH;
  const mCtx = maskCanvas.getContext("2d")!;
  const imgData = mCtx.createImageData(maskW, maskH);
  const d = imgData.data;

  for (let i = 0; i < closed.length; i++) {
    const idx = i * 4;
    const alpha = closed[i] ? 255 : 0;
    d[idx] = 0; // R
    d[idx + 1] = 0; // G
    d[idx + 2] = 0; // B
    d[idx + 3] = alpha;
  }
  mCtx.putImageData(imgData, 0, 0);

  // ── 4. 抗锯齿放大到目标画布 ──
  if (targetCanvas.width !== displayW || targetCanvas.height !== displayH) {
    targetCanvas.width = displayW;
    targetCanvas.height = displayH;
  }
  const ctx = targetCanvas.getContext("2d")!;
  ctx.globalCompositeOperation = "copy"; // 直接覆盖
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(maskCanvas, 0, 0, displayW, displayH);
  ctx.globalCompositeOperation = "source-over"; // 恢复默认
}

// 组件顶层声明
let prevMask1: Float32Array | null = null; // 上一帧
let prevMask2: Float32Array | null = null; // 上两帧

// 在 processFrame 里，合并完 personMask 后：
function applyTemporalSmooth(current: Float32Array): Float32Array {
  if (!prevMask1 || !prevMask2 || prevMask1.length !== current.length) {
    prevMask2 = new Float32Array(current);
    prevMask1 = new Float32Array(current);
    return current;
  }

  const smoothed = new Float32Array(current.length);

  for (let i = 0; i < current.length; i++) {
    const c = current[i];
    const p1 = prevMask1[i];
    const p2 = prevMask2[i];

    // 类型/数值防护：确保都是有限数字
    if (
      typeof c !== "number" ||
      typeof p1 !== "number" ||
      typeof p2 !== "number" ||
      Number.isNaN(c) ||
      Number.isNaN(p1) ||
      Number.isNaN(p2) ||
      !Number.isFinite(c) ||
      !Number.isFinite(p1) ||
      !Number.isFinite(p2)
    ) {
      smoothed[i] = c ?? 0;
      continue;
    }

    smoothed[i] = c * 0.5 + p1 * 0.3 + p2 * 0.2;
  }

  prevMask2.set(prevMask1);
  prevMask1.set(current);

  return smoothed;
}

// ============ DOM 引用 ============
const videoRef = ref<HTMLVideoElement>();
const canvasRef = ref<HTMLCanvasElement>();
const danmakuViewRef = ref<HTMLCanvasElement>();

// ============ 响应式状态 ============
const loading = ref<boolean>(true);
const errorMessage = ref<string>("");

// ============ 内部状态 ============
let segmenter: ImageSegmenter | null = null;
let animationId: number | null = null;
let imageData: ImageData | null = null;
let lastTimestamp = -1;
// 多分类模型
const multiclassModelAssetPath =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
// 分割模型
const segmenterModelAssetPath =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

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
 * 将 canvas 内部绘制尺寸同步为视频原始分辨率
 */
function syncCanvasSize(): void {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  const danmakuView = danmakuViewRef.value;
  if (!video || !canvas) return;

  const width = video.videoWidth || video.clientWidth || 500;
  const height = video.videoHeight || video.clientHeight || 500;

  canvas.width = width;
  canvas.height = height;

  if (danmakuView) {
    danmakuView.width = width;
    danmakuView.height = height;
  }
}

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

/**
 * 处理单帧视频：分割、生成掩码并绘制到 Canvas
 * 由 requestAnimationFrame 循环驱动
 * requestAnimationFrame：请求浏览器在下一次重绘前调用指定的回调函数
 */
function processFrame(): void {
  const video = videoRef.value;
  const canvas = canvasRef.value; // 作用：返回的图片到 Canvas 上
  if (!video || !canvas || !segmenter) {
    animationId = requestAnimationFrame(processFrame); // 递归调用，等待视频加载完成
    return;
  }

  if (video.readyState < 2 || video.paused) {
    animationId = requestAnimationFrame(processFrame);
    return;
  }

  // 使用视频播放时间作为单调递增时间戳
  const timestampMs = video.currentTime * 1000;
  if (timestampMs <= lastTimestamp) {
    animationId = requestAnimationFrame(processFrame);
    return;
  }
  lastTimestamp = timestampMs; // 更新上次处理时间戳

  try {
    const result = segmenter.segmentForVideo(video, timestampMs);

    // ── 多分类 mask 合并 ──
    const firstMask = result.confidenceMasks?.[0];
    if (!firstMask) {
      result.close?.();
      animationId = requestAnimationFrame(processFrame);
      return;
    }

    const w = firstMask.width;
    const h = firstMask.height;
    let personMask: Float32Array = new Float32Array(w * h).fill(0); // 创建人物掩码数组

    // 忽略第0个分类是背景，不参与合并
    for (let idx = 1; idx <= 5; idx++) {
      const mask = result.confidenceMasks?.[idx]; // 获取当前分类的mask
      if (!mask) continue;
      const data = mask.getAsFloat32Array(); // 获取 mask 数据
      if (idx === 1) {
        // 第一个类别直接拷贝，省去和 0 比较
        personMask.set(data);
      } else {
        for (let i = 0; i < data.length; i++) {
          if (data[i] > personMask[i]) personMask[i] = data[i];
        }
      }
      mask.close?.();
    }

    // ── 复用 ImageData，用 personMask 填充 ──
    if (!imageData || imageData.width !== w || imageData.height !== h) {
      imageData = new ImageData(w, h);
    }
    const data = imageData.data;
    // 1. 时序平滑
    personMask = applyTemporalSmooth(personMask);
    for (let i = 0; i < personMask.length; i++) {
      const idx = i * 4;
      const conf = personMask[i];
      const alpha = conf < 0.1 ? 0 : Math.round(conf * 255);

      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = alpha;
    }

    // ── 绘制 ──
    // ── 抗锯齿绘制 ──
    const displayW = video.videoWidth || video.clientWidth || 500;
    const displayH = video.videoHeight || video.clientHeight || 500;

    drawMaskAntialiased(personMask, w, h, canvas, displayW, displayH);

    // ── 弹幕效果：在新画布上叠加经人物掩码裁剪的弹幕 ──
    const danmakuView = danmakuViewRef.value;
    if (danmakuView) {
      // 1. 绘制视频帧作为背景
      const dCtx = danmakuView.getContext("2d")!;
      dCtx.drawImage(video, 0, 0, displayW, displayH);
      // 2. 叠加裁剪后的弹幕（人物区域透明，不影响视频）
      drawDanmakuOverlay(danmakuView, displayW, displayH);
    }

    // ── 释放 ──
    firstMask.close?.();
    result.close?.();
  } catch (err) {
    console.error("帧处理错误:", err);
  }

  animationId = requestAnimationFrame(processFrame);
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
    syncCanvasSize(); // 同步 canvas 尺寸
    lastTimestamp = -1;
    if (segmenter) processFrame();
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
  imageData = null;
});
</script>
