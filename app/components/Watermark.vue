<template>
  <!-- 无DOM模板，canvas由JS动态创建挂载到body -->
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

// 定义Props类型
interface WatermarkProps {
  /** 水印文本内容 */
  text?: string;
  /** 字号（px） */
  fontSize?: number;
  /** 文字颜色（CSS 颜色值） */
  color?: string;
  /** 不透明度（0-1） */
  opacity?: number;
  /** 旋转角度（度，负值为逆时针） */
  rotate?: number;
  /** 水平间距（px，相邻水印单元的列距） */
  gapX?: number;
  /** 垂直间距（px，相邻水印单元的行距） */
  gapY?: number;
}

const props = withDefaults(defineProps<WatermarkProps>(), {
  text: '用户ID: 10086 | 内部资料 禁止截屏外传',
  fontSize: 16,
  color: '#999999',
  opacity: 0.18,
  rotate: -20,
  gapX: 220,
  gapY: 140,
});

let watermarkCanvas: HTMLCanvasElement | null = null;
let observer: MutationObserver | null = null;
let timerCheck: number | null = null;
let enableCheck = false;
let lastSnapshot: Record<string, string> | null = null;

const BASE_STYLE = {
  position: 'fixed',
  top: '0px',
  left: '0px',
  // 浮于页面内容之上（低于 app.vue 过场动画层 9999），配合 pointerEvents 穿透点击
  zIndex: '9998',
  pointerEvents: 'none',
  display: '',
  opacity: '',
};

/**
 * 采集元素受保护的内联样式快照（BASE_STYLE 涉及的属性）
 * 用于防篡改比对
 * @param el - 目标元素（水印 canvas）
 * @returns 形如 { position: 'fixed', zIndex: '9998', ... } 的样式键值快照
 */
function getStyleSnapshot(el: HTMLElement) {
  const snapshot: Record<string, string> = {};
  Object.keys(BASE_STYLE).forEach((key) => {
    snapshot[key] = (el.style as any)[key] ?? '';
  });
  return snapshot;
}

/**
 * 比较两份样式快照是否存在差异
 * @param prev - 上一份快照（基准）
 * @param curr - 当前快照
 * @returns true 表示任一受保护属性被修改（疑似篡改）
 */
function isSnapshotDiff(prev: Record<string, string>, curr: Record<string, string>) {
  for (const key in BASE_STYLE) {
    if (prev[key] !== curr[key]) {
      return true;
    }
  }
  return false;
}

/**
 * 创建水印 canvas 元素并应用 BASE_STYLE 基础样式
 * @returns 已设置 id 与基础样式的 canvas 元素
 */
function createCanvasEl() {
  const canvas = document.createElement('canvas');
  canvas.id = '__watermark_canvas__';
  Object.keys(BASE_STYLE).forEach((key) => {
    (canvas.style as any)[key] = (BASE_STYLE as any)[key];
  });
  return canvas;
}

/**
 * 在整屏范围内绘制水印图案（按 gapX/gapY 网格铺满旋转文字）
 * 依赖全局模块状态 watermarkCanvas，接收不到也无需返回参数
 * @returns 无返回值
 */
function renderWatermark() {
  if (!watermarkCanvas) return;
  const ctx = watermarkCanvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  watermarkCanvas.width = viewW * dpr;
  watermarkCanvas.height = viewH * dpr;
  watermarkCanvas.style.width = `${viewW}px`;
  watermarkCanvas.style.height = `${viewH}px`;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, viewW, viewH);

  ctx.fillStyle = props.color;
  ctx.globalAlpha = props.opacity;
  ctx.font = `${props.fontSize}px Microsoft YaHei`;

  const gapX = props.gapX;
  const gapY = props.gapY;
  const rotateRad = (props.rotate * Math.PI) / 180;

  for (let x = -gapX; x < viewW + gapX; x += gapX) {
    for (let y = -gapY; y < viewH + gapY; y += gapY) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotateRad);
      ctx.fillText(props.text, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * 检查水印是否被篡改（被删或样式被改），发现则提示并自动恢复
 * 由 MutationObserver 与定时器共同触发；依赖全局 enableCheck 开关
 * @returns 无返回值；元素被删时会调用 initWatermark() 重建
 */
function checkAndRecover() {
  if (!enableCheck) return;
  const canvasEl = document.getElementById('__watermark_canvas__') as HTMLCanvasElement;
  if (!canvasEl) {
    alert('⚠️ 检测到水印元素被删除，禁止篡改页面水印！');
    initWatermark();
    return;
  }
  const currSnapshot = getStyleSnapshot(canvasEl);
  if (lastSnapshot && isSnapshotDiff(lastSnapshot, currSnapshot)) {
    alert('⚠️ 检测到水印样式被篡改，已自动恢复水印！');
    Object.keys(BASE_STYLE).forEach((key) => {
      (canvasEl.style as any)[key] = (BASE_STYLE as any)[key];
    });
    renderWatermark();
    lastSnapshot = getStyleSnapshot(canvasEl);
  }
}

/**
 * 启动防篡改监控：监听 DOM 变更 + 每 800ms 轮询一次 checkAndRecover
 * 在 initWatermark 建立水印并采集基准快照后调用
 * @returns 无返回值；副作用为创建 MutationObserver 与定时器（存于模块级变量以便清理）
 */
function startWatch() {
  observer = new MutationObserver(() => {
    checkAndRecover();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'id'],
  });
  timerCheck = window.setInterval(checkAndRecover, 800);
}

/**
 * 初始化水印：清理旧资源、创建并绘制 canvas、注册 resize 监听、
 * 延迟采集基准快照后开启防篡改监控
 * @returns 无返回值；副作用为挂载水印元素并启动 startWatch()
 */
function initWatermark() {
  enableCheck = false;
  document.body.style.opacity = '';

  if (timerCheck) clearInterval(timerCheck);
  if (observer) observer.disconnect();

  const old = document.getElementById('__watermark_canvas__');
  if (old) old.remove();

  watermarkCanvas = createCanvasEl();
  document.body.appendChild(watermarkCanvas);
  renderWatermark();

  window.removeEventListener('resize', renderWatermark);
  window.addEventListener('resize', renderWatermark);

  setTimeout(() => {
    lastSnapshot = getStyleSnapshot(watermarkCanvas!);
    enableCheck = true;
    startWatch();
  }, 300);
}

// 监听props变化，更新水印
watch(
  () => props,
  () => {
    renderWatermark();
  },
  { deep: true }
);

onMounted(() => {
  initWatermark();
});

onUnmounted(() => {
  if (observer) observer.disconnect();
  if (timerCheck) clearInterval(timerCheck);
  window.removeEventListener('resize', renderWatermark);
  const old = document.getElementById('__watermark_canvas__');
  if (old) old.remove();
});
</script>