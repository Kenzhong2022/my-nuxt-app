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

export function useDanmaku() {
  let danmakuList: DanmakuItem[] = [];
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

  function render(
    targetCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    if (!maskCanvas) return;

    // 获取掩码像素数据
    const maskCtx = maskCanvas.getContext("2d")!;
    const maskImageData = maskCtx.getImageData(
      0,
      0,
      maskCanvas.width,
      maskCanvas.height,
    );
    const maskData = maskImageData.data;
    const maskW = maskCanvas.width;
    const maskH = maskCanvas.height;
    const scaleX = maskW / width;
    const scaleY = maskH / height;
    const PADDING_PX = 4; // 安全距离，防止边缘闪烁

    // 准备弹幕离屏层
    if (
      danmakuLayerCanvas.width !== width ||
      danmakuLayerCanvas.height !== height
    ) {
      danmakuLayerCanvas.width = width;
      danmakuLayerCanvas.height = height;
    }
    const layerCtx = danmakuLayerCanvas.getContext("2d")!;
    layerCtx.clearRect(0, 0, width, height);
    layerCtx.textBaseline = "top";

    danmakuList = danmakuList.filter((item) => {
      // 更新位置
      layerCtx.font = `bold ${item.fontSize}px sans-serif`;
      const textWidth = layerCtx.measureText(item.text).width;
      item.x += item.speed;
      if (item.x > width) {
        item.x = -textWidth;
        item.y = 20 + Math.random() * (height - 40);
      }

      // 文字矩形 (加 padding)
      const rectX = item.x - PADDING_PX;
      const rectY = item.y - PADDING_PX;
      const rectW = textWidth + PADDING_PX * 2;
      const rectH = item.fontSize + PADDING_PX * 2;

      // 映射到掩码坐标
      const maskX = Math.max(0, Math.floor(rectX * scaleX));
      const maskY = Math.max(0, Math.floor(rectY * scaleY));
      const maskX2 = Math.min(maskW, Math.ceil((rectX + rectW) * scaleX));
      const maskY2 = Math.min(maskH, Math.ceil((rectY + rectH) * scaleY));

      // 检查掩码 Alpha 通道
      let overlapped = false;
      for (let y = maskY; y < maskY2; y++) {
        for (let x = maskX; x < maskX2; x++) {
          const idx = (y * maskW + x) * 4 + 3; // alpha
          if (maskData[idx] > 0) {
            overlapped = true;
            break;
          }
        }
        if (overlapped) break;
      }

      // 只有不重叠才绘制
      if (!overlapped) {
        layerCtx.fillStyle = item.color;
        layerCtx.globalAlpha = item.opacity ?? 1;
        layerCtx.fillText(item.text, item.x, item.y);
        layerCtx.globalAlpha = 1;
      }

      return true; // 保留弹幕数据
    });

    targetCtx.drawImage(danmakuLayerCanvas, 0, 0);
  }

  function dispose() {
    clear();
    maskCanvas = null;
  }

  return { addDanmaku, addDanmakus, clear, setMaskCanvas, render, dispose };
}
