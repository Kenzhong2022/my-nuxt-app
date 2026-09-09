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
    <!-- 图片上传区域 -->
    <div class="upload-wrap" style="margin-top: 16px; display: flex; gap: 16px; align-items: center">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :limit="2"
        accept="image/*"
        multiple
        @change="handleFileChange"
        @remove="handleFileRemove"
        :show-file-list="false"
      >
        <el-button type="primary">选择图片（最多2张）</el-button>
      </el-upload>
      <div class="thumb-list" style="display: flex; gap: 8px">
        <div v-for="(base, idx) in imgBase64List" :key="idx" style="width: 60px; height: 60px; border: 1px solid #ccc">
          <img :src="base" style="width: 100%; height: 100%; object-fit: cover" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import type { UploadRawFile, UploadFile } from 'element-plus';
// ---------- DOM 引用 ----------
const canvasRef = ref<HTMLCanvasElement | null>(null);
const uploadRef = ref<any>(null);
// ---------- 响应式数据 ----------
const sliderValue = ref(0);
const progressPercent = ref('0.0');
// 存放上传图片 base64
const imgBase64List = ref<string[]>([]);
// 维护选中的原始文件
const rawFileList = ref<File[]>([]);

// ---------- 常量 ----------
const WIDTH = 400;
const HEIGHT = 400;
const END_X = 400;
const BASE_WIDTH = 260;
const MAX_WIDTH = WIDTH;
const BASE_SKEW = 45;
const STROKE_WIDTH = 3;
// ---------- 内部状态 ----------
let ctx: CanvasRenderingContext2D | null = null;
let sourceImage: HTMLImageElement | null = null;
let colorOffCanvas: HTMLCanvasElement | null = null;
let colorOffCtx: CanvasRenderingContext2D | null = null;
let frameOffCanvas: HTMLCanvasElement | null = null;
let frameOffCtx: CanvasRenderingContext2D | null = null;
let tl: gsap.core.Timeline | null = null;
// 预加载的图片数组
let loadedImages: HTMLImageElement[] = [];
// 当前显示的图片索引（响应式，可用于其他绑定）
const currentImgIndex = ref(0);
// 是否处于自动播放状态（用于区分手动拖拽）
let isAutoPlaying = false;
// 动画状态对象（GSAP 直接驱动）
const state = {
  x: -END_X + 20,
  width: BASE_WIDTH,
  skew: 45,
};
/**
 * @description 绘制平行四边形路径
 */
function drawParallelogram(context: CanvasRenderingContext2D, px: number, py: number, width: number, skew: number) {
  context.beginPath();
  context.moveTo(px + skew, py);
  context.lineTo(px + width, py);
  context.lineTo(px + width - skew, py + HEIGHT);
  context.lineTo(px, py + HEIGHT);
  context.closePath();
}
/**
 * @description 核心渲染函数
 */
function renderFrame(currentWidth: number, currentSkew: number) {
  if (!sourceImage || !ctx) return;
  const px = state.x;
  const py = 0;
  // 1. 彩色窗口（离屏）
  colorOffCtx!.clearRect(0, 0, WIDTH, HEIGHT);
  colorOffCtx!.drawImage(sourceImage, 0, 0, WIDTH, HEIGHT);
  drawParallelogram(colorOffCtx!, px, py, currentWidth, currentSkew);
  colorOffCtx!.globalCompositeOperation = 'destination-in';
  colorOffCtx!.fill();
  colorOffCtx!.globalCompositeOperation = 'source-over';
  // 2. 纯黑色边框（离屏）
  frameOffCtx!.clearRect(0, 0, WIDTH, HEIGHT);
  drawParallelogram(frameOffCtx!, px, py, currentWidth, currentSkew);
  frameOffCtx!.strokeStyle = '#000';
  frameOffCtx!.lineWidth = STROKE_WIDTH;
  frameOffCtx!.stroke();
  // 3. 主画布合成
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  // 底层：灰度图
  ctx.drawImage(sourceImage, 0, 0, WIDTH, HEIGHT);
  const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114;
    if (isNaN(gray)) continue;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  // 上下裁剪黑边
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, WIDTH, 50);
  ctx.fillRect(0, HEIGHT - 50, WIDTH, 50);
  // 叠加彩色窗口和边框
  ctx.drawImage(colorOffCanvas!, 0, 0);
  ctx.drawImage(frameOffCanvas!, 0, 0);
}
/**
 * @description 将 File 转 Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
/**
 * @description base64 预加载图片
 */
function preloadByBase64(baseList: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    baseList.map((base) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = base;
      });
    }),
  );
}

/**
 * @description 文件新增
 */
async function handleFileChange(uploadFile: UploadFile) {
  const rawFile = uploadFile.raw as File;
  if (!rawFile) return;
  // 最多2张
  if (rawFileList.value.length < 2) {
    rawFileList.value.push(rawFile);
  } else {
    // 超过2张，替换最后一个
    rawFileList.value[1] = rawFile;
  }
  await updateImageFromFiles();
}

/**
 * @description 文件移除
 */
async function handleFileRemove(uploadFile: UploadFile) {
  const rawFile = uploadFile.raw as File;
  rawFileList.value = rawFileList.value.filter((item) => item !== rawFile);
  await updateImageFromFiles();
}

/**
 * 根据 rawFileList 更新 base64 和画布图片
 */
async function updateImageFromFiles() {
  const files = rawFileList.value;
  const baseList = await Promise.all(files.map(fileToBase64));
  imgBase64List.value = baseList;

  // 不足两张，复制第一张补齐
  let useBaseList = [...baseList];
  if (useBaseList.length === 1 && useBaseList[0] !== undefined) {
    useBaseList.push(useBaseList[0]);
  }
  if (useBaseList.length === 0) return;

  // 加载图片资源
  try {
    loadedImages = await preloadByBase64(useBaseList);
    // 重置索引
    currentImgIndex.value = 0;
    setImageByIndex(currentImgIndex.value);
    // 重置动画时间线到起点
    if (tl) {
      tl.pause();
      tl.progress(0);
      sliderValue.value = 0;
      progressPercent.value = '0.0';
    }
  } catch (err) {
    console.error('图片加载失败', err);
  }
}

/**
 * @description 切换当前显示的图片（根据索引）
 */
function setImageByIndex(index: number) {
  if (loadedImages.length === 0) return;
  const safeIndex = index % loadedImages.length;
  sourceImage = loadedImages[safeIndex] ?? null;
  renderFrame(state.width, state.skew);
}
// ---------- 用户操作 ----------
function startAnimation() {
  if (tl) {
    isAutoPlaying = true; // 标记为自动播放
    tl.restart();
  }
}
function onSliderInput(val: number) {
  if (tl) {
    isAutoPlaying = false; // 手动拖拽，禁止自动切图
    tl.pause();
    tl.progress(val);
    sliderValue.value = val;
    progressPercent.value = (val * 100).toFixed(1);
  }
}
// ---------- 初始化 ----------
async function init() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  // 创建离屏画布
  colorOffCanvas = document.createElement('canvas');
  colorOffCanvas.width = WIDTH;
  colorOffCanvas.height = HEIGHT;
  colorOffCtx = colorOffCanvas.getContext('2d');
  frameOffCanvas = document.createElement('canvas');
  frameOffCanvas.width = WIDTH;
  frameOffCanvas.height = HEIGHT;
  frameOffCtx = frameOffCanvas.getContext('2d');
  // 防止同一轮结束重复触发的标记
  let wasAtEnd = false;
  // 创建动画时间线
  tl = gsap.timeline({
    paused: true,
    onUpdate: () => {
      const prog = tl!.progress();
      sliderValue.value = prog;
      progressPercent.value = (prog * 100).toFixed(1);
      // 仅在自动播放时检测一轮结束
      if (isAutoPlaying) {
        if (prog >= 0.999 && !wasAtEnd) {
          console.log('一轮完成，切换图片');
          wasAtEnd = true;
          // 切换到下一张图片
          currentImgIndex.value = (currentImgIndex.value + 1) % loadedImages.length;
          setImageByIndex(currentImgIndex.value);
        }
        if (prog < 0.001) {
          wasAtEnd = false; // 进度重置，准备下一轮
        }
      }
      // 每帧渲染
      renderFrame(state.width, state.skew);
    },
    repeat: -1, // 无限循环
  });
  // 第一段动画：从左到右，宽度由最大变最小
  tl.to(state, {
    x: END_X - BASE_WIDTH / 5,
    width: BASE_WIDTH,
    skew: BASE_SKEW * (state.width / BASE_WIDTH),
    duration: 1,
    ease: 'power2.inOut',
  });
  // 第二段动画：从右到左，宽度由最小变最大
  tl.to(state, {
    x: 0,
    width: MAX_WIDTH,
    skew: 0,
    duration: 1,
    ease: 'power2.in',
  });
  // 延迟结束，让用户多看一会
  tl.to(state, {
    duration: 2,
    ease: 'power2.inOut',
  });
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
