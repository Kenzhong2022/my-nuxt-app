<template>
  <div>
    <canvas ref="canvasRef" width="400" height="400" />
    <div class="control-wrap">
      <el-button @click="startAnimation">开始动画</el-button>
      <span>进度:</span>
      <el-slider
        v-model="sliderValue"
        :min="0"
        :max="1"
        :step="0.001"
        style="width: 260px"
        @input="(val) => onSliderInput(val as number)"
      />
      <span>{{ progressPercent }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import gsap from "gsap";

// ---------- DOM 引用 ----------
const canvasRef = ref<HTMLCanvasElement | null>(null);

// ---------- 响应式数据 ----------
const sliderValue = ref(0);
const progressPercent = ref("0.0");

// ---------- 常量 ----------
const IMG_URL =
  "https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg";
const WIDTH = 400;
const HEIGHT = 400;
const END_X = 400; // 移动范围 [-400, 400]
const BASE_WIDTH = 260; // 右端最小宽度
const MAX_WIDTH = WIDTH; // 左端最大宽度 = 画布宽度
const BASE_SKEW = 45; // 基础斜边偏移（对应 BASE_WIDTH）
const STROKE_WIDTH = 3; // 固定边框粗细

// ---------- 内部状态 ----------
let ctx: CanvasRenderingContext2D | null = null;
let sourceImage: HTMLImageElement | null = null;
let colorOffCanvas: HTMLCanvasElement | null = null;
let colorOffCtx: CanvasRenderingContext2D | null = null;
let frameOffCanvas: HTMLCanvasElement | null = null;
let frameOffCtx: CanvasRenderingContext2D | null = null;
let tl: gsap.core.Timeline | null = null;

// 动画状态：同时包含位置和宽度
const state = {
  x: -END_X + 20, // 初始在最左端
  width: BASE_WIDTH, // 初始最宽宽度
  skew: 45, // 初始斜边偏移
};

/**
 * @description 绘制平行四边形路径（带偏移）
 */
function drawParallelogram(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  width: number,
  skew: number,
) {
  context.beginPath();
  context.moveTo(px + skew, py);
  context.lineTo(px + width, py);
  context.lineTo(px + width - skew, py + HEIGHT);
  context.lineTo(px, py + HEIGHT);
  context.closePath();
}

// ---------- 渲染函数（接受宽度参数） ----------
function renderFrame(currentWidth: number, currentSkew: number) {
  if (!sourceImage || !ctx) return;

  const px = state.x;
  const py = 0;

  // 1. 彩色窗口（离屏）
  colorOffCtx!.clearRect(0, 0, WIDTH, HEIGHT);
  colorOffCtx!.drawImage(sourceImage, 0, 0, WIDTH, HEIGHT);
  drawParallelogram(colorOffCtx!, px, py, currentWidth, currentSkew);
  colorOffCtx!.globalCompositeOperation = "destination-in";
  colorOffCtx!.fill();
  colorOffCtx!.globalCompositeOperation = "source-over";

  // 2. 纯黑色边框（离屏）
  frameOffCtx!.clearRect(0, 0, WIDTH, HEIGHT);
  drawParallelogram(frameOffCtx!, px, py, currentWidth, currentSkew);
  frameOffCtx!.strokeStyle = "#000";
  frameOffCtx!.lineWidth = STROKE_WIDTH; // 使用固定值
  frameOffCtx!.stroke();

  // 3. 主画布合成
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // 底层：灰度图
  ctx.drawImage(sourceImage, 0, 0, WIDTH, HEIGHT);
  const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // 灰度化
    const gray = data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114;
    if (isNaN(gray)) continue;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);

  // 灰度图上下裁剪 50px（只影响背景）
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, WIDTH, 50);
  ctx.fillRect(0, HEIGHT - 50, WIDTH, 50);

  // 叠加彩色窗口和边框
  ctx.drawImage(colorOffCanvas!, 0, 0);
  ctx.drawImage(frameOffCanvas!, 0, 0);
}

// ---------- 动画控制 ----------
function startAnimation() {
  if (tl) {
    tl.restart();
  }
}

function onSliderInput(val: number) {
  if (tl) {
    tl.pause();
    tl.progress(val);
    sliderValue.value = val;
    progressPercent.value = (val * 100).toFixed(1);
  }
}

// ---------- 初始化 ----------
function init() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  ctx = canvas.getContext("2d");

  // 离屏画布
  colorOffCanvas = document.createElement("canvas");
  colorOffCanvas.width = WIDTH;
  colorOffCanvas.height = HEIGHT;
  colorOffCtx = colorOffCanvas.getContext("2d");

  frameOffCanvas = document.createElement("canvas");
  frameOffCanvas.width = WIDTH;
  frameOffCanvas.height = HEIGHT;
  frameOffCtx = frameOffCanvas.getContext("2d");

  // 创建 GSAP 动画：往返一次，同时驱动 x 和 width
  tl = gsap.timeline({
    paused: true,
    onUpdate: () => {
      const prog = tl!.progress();
      sliderValue.value = prog;
      progressPercent.value = (prog * 100).toFixed(1);
      // 使用当前 state.width 进行渲染
      renderFrame(state.width, state.skew);
    },
    onComplete: () => {
      console.log("动画完成（往返结束）");
    },
  });

  // 第一段：从左到右，宽度由最大变最小
  tl.to(state, {
    x: END_X - BASE_WIDTH / 5,
    width: BASE_WIDTH,
    skew: BASE_SKEW * (state.width / BASE_WIDTH),
    duration: 1,
    ease: "power2.inOut",
  });
  // 第二段：从右到左，宽度由最小变最大
  tl.to(state, {
    x: 0,
    width: MAX_WIDTH,
    skew: 0,
    duration: 1,
    ease: "power2.in",
  });

  // 加载图片
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = IMG_URL;
  img.onload = () => {
    sourceImage = img;
    // 初始渲染（此时 state.width = MAX_WIDTH）
    renderFrame(state.width, state.skew);
  };
}

// ---------- 生命周期 ----------
onMounted(() => {
  init();
});

onUnmounted(() => {
  if (tl) {
    tl.kill();
    tl = null;
  }
});
</script>

<style scoped>
.control-wrap {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
canvas {
  border: 1px solid #999;
}
</style>
