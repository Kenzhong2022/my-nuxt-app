// composables/useDanmaku.ts
interface DanmakuItem {
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
  fontSize: number;
  opacity?: number;
}

interface Crop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export function useDanmaku() {
  let danmakuList: DanmakuItem[] = [];
  /** 人物区域蒙版画布 人物存在的地方alpha通道不为0 */
  let maskCanvas: HTMLCanvasElement | null = null;
  const danmakuLayerCanvas = document.createElement("canvas");

  function addDanmaku(item: DanmakuItem) {
    danmakuList.push(item);
  }
  function addDanmakus(items: DanmakuItem[]) {
    danmakuList.push(...items);
  }
  function clear() {
    danmakuList = [];
  }
  function setMaskCanvas(canvas: HTMLCanvasElement) {
    maskCanvas = canvas;
  }

  /**
   * 渲染弹幕到目标上下文
   * @param targetCtx 目标上下文
   * @param width 目标宽度
   * @param height 目标高度
   * @param crop 蒙版裁剪参数，与视频绘制时的裁剪保持一致
   */
  function render(
    targetCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    crop?: Crop,
  ) {
    if (!maskCanvas) return;

    // 准备离屏画布（大小与渲染尺寸一致）
    if (
      danmakuLayerCanvas.width !== width ||
      danmakuLayerCanvas.height !== height
    ) {
      danmakuLayerCanvas.width = width;
      danmakuLayerCanvas.height = height;
    }
    const layerCtx = danmakuLayerCanvas.getContext("2d")!;
    layerCtx.clearRect(0, 0, width, height);

    // 1. 绘制所有弹幕（全部绘制，不关心碰撞）
    for (const item of danmakuList) {
      // 更新位置
      layerCtx.font = `bold ${item.fontSize}px sans-serif`;
      const textWidth = layerCtx.measureText(item.text).width;
      item.x += item.speed;
      if (item.x > width - 20) {
        item.x = -textWidth;
        item.y = 20 + Math.random() * (height - 40);
      }
      // 绘制弹幕
      layerCtx.fillStyle = item.color;
      layerCtx.globalAlpha = item.opacity ?? 1;
      layerCtx.textBaseline = "top";
      layerCtx.fillText(item.text, item.x, item.y);
    }
    layerCtx.globalAlpha = 1;

    // 2. 使用蒙版擦除人物区域的弹幕
    // drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
    //   源矩形(sx,sy,sw,sh): 从 maskCanvas 的哪个区域裁剪（与视频裁剪保持一致）
    //   目标矩形(dx,dy,dw,dh): 裁剪后的蒙版绘制到离屏画布的位置和尺寸
    layerCtx.globalCompositeOperation = "destination-out"; // 后画上来的会挖走前面的画布
    // 将 maskCanvas 按裁剪参数缩放绘制到离屏画布（人物区域 alpha > 0 会擦除弹幕）
    layerCtx.drawImage(
      maskCanvas,
      crop?.sx ?? 0,
      crop?.sy ?? 0,
      crop?.sw ?? maskCanvas.width,
      crop?.sh ?? maskCanvas.height,
      0,
      0,
      width,
      height,
    );
    layerCtx.globalCompositeOperation = "source-over"; // 两个我都要，后画上去的在上面

    // 3. 将处理后的离屏画布绘制到目标上下文
    targetCtx.drawImage(danmakuLayerCanvas, 0, 0);
  }

  function dispose() {
    clear();
    maskCanvas = null;
  }

  return { addDanmaku, addDanmakus, clear, setMaskCanvas, render, dispose };
}
