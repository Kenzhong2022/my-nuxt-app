export function useMaskProcessor() {
  const maskCanvas = document.createElement("canvas");

  let prevMask1: Float32Array | null = null;
  let prevMask2: Float32Array | null = null;

  /**
   * 膨胀操作：增加掩码区域
   * @param maskData - 输入掩码数据
   * @param width - 视频宽度
   * @param height - 视频高度
   * @param kernelSize - 膨胀核大小
   * @returns 膨胀后的掩码数据
   */
  function dilate(
    maskData: Float32Array,
    width: number,
    height: number,
    kernelSize: number = 3,
  ): Float32Array {
    const result = new Float32Array(maskData.length);
    const halfKernel = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxVal = 0;
        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const idx = ny * width + nx;
              const value = maskData[idx] ?? 0;
              if (value > maxVal) {
                maxVal = value;
              }
            }
          }
        }
        result[y * width + x] = maxVal;
      }
    }

    return result;
  }

  /**
   * 腐蚀操作：减少掩码区域
   * @param maskData - 输入掩码数据
   * @param width - 视频宽度
   * @param height - 视频高度
   * @param kernelSize - 腐蚀核大小
   * @returns 腐蚀后的掩码数据
   */
  function erode(
    maskData: Float32Array,
    width: number,
    height: number,
    kernelSize: number = 3,
  ): Float32Array {
    const result = new Float32Array(maskData.length);
    const halfKernel = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minVal = 1;
        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const idx = ny * width + nx;
              const value = maskData[idx] ?? 0;
              if (value < minVal) {
                minVal = value;
              }
            } else {
              minVal = 0;
            }
          }
        }
        result[y * width + x] = minVal;
      }
    }

    return result;
  }

  /**
   * 闭运算：先膨胀再腐蚀
   * @param maskData - 输入掩码数据
   * @param width - 视频宽度
   * @param height - 视频高度
   * @param kernelSize - 腐蚀核大小
   * @returns 闭运算后的掩码数据
   */
  function applyClosing(
    maskData: Float32Array,
    width: number,
    height: number,
    kernelSize: number = 3,
  ): Float32Array {
    const dilated = dilate(maskData, width, height, kernelSize);
    return erode(dilated, width, height, kernelSize);
  }

  /**
   * 时间平滑处理：对当前帧的掩码进行平滑处理，考虑前两帧的掩码
   * @param current - 当前帧的掩码数据
   * @returns 平滑后的掩码数据
   */
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

  /**
   * 绘制抗锯齿后的掩码到目标画布
   * @param maskData - 掩码数据
   * @param maskW - 掩码宽度
   * @param maskH - 掩码高度
   * @param targetCanvas - 目标画布
   * @param displayW - 显示宽度
   * @param displayH - 显示高度
   */
  function drawMaskAntialiased(
    maskData: Float32Array,
    maskW: number,
    maskH: number,
    targetCanvas: HTMLCanvasElement,
    displayW: number,
    displayH: number,
  ): void {
    const threshold = 0.3;
    const binary = new Uint8Array(maskData.length);
    for (let i = 0; i < maskData.length; i++) {
      binary[i] = (maskData[i] ?? 0) > threshold ? 255 : 0;
    }

    maskCanvas.width = maskW;
    maskCanvas.height = maskH;
    const mCtx = maskCanvas.getContext("2d")!;
    const imgData = mCtx.createImageData(maskW, maskH);
    const d = imgData.data;

    for (let i = 0; i < binary.length; i++) {
      const idx = i * 4;
      const value = binary[i] ?? 0;
      const alpha = value > 0 ? 255 : 0;
      d[idx] = 0;
      d[idx + 1] = 0;
      d[idx + 2] = 0;
      d[idx + 3] = alpha;
    }
    mCtx.putImageData(imgData, 0, 0);

    if (targetCanvas.width !== displayW || targetCanvas.height !== displayH) {
      targetCanvas.width = displayW;
      targetCanvas.height = displayH;
    }
    const ctx = targetCanvas.getContext("2d")!;
    ctx.globalCompositeOperation = "copy"; // 目标复制源，保留背景弹幕
    ctx.imageSmoothingEnabled = true; // 开启抗锯齿
    ctx.imageSmoothingQuality = "high"; // 高质量抗锯齿
    ctx.drawImage(maskCanvas, 0, 0, displayW, displayH); // 绘制抗锯齿后的掩码
    ctx.globalCompositeOperation = "source-over";
  }

  function getMaskCanvas(): HTMLCanvasElement {
    return maskCanvas;
  }

  /**
   * 填充掩码内部的封闭孔洞（不被人物包围的背景区域）
   * @param maskData - 二值化的掩码 Float32Array（值为 0 或 1）
   * @param width - 掩码宽度
   * @param height - 掩码高度
   * @returns 填充后的 Float32Array
   */
  function fillInternalHoles(
    maskData: Float32Array,
    width: number,
    height: number,
  ): Float32Array {
    // 创建临时数组，0=未知, 1=外部背景, 2=人物
    const label = new Uint8Array(maskData.length);

    // 初始化：人物区域标记为 2，背景区域标记为 0（待分类）
    for (let i = 0; i < maskData.length; i++) {
      label[i] = maskData[i] > 0.5 ? 2 : 0; // 假设已经是二值化后的 0/1
    }

    // 从四条边界开始洪水填充，标记所有连接到边界的背景为 1
    const queue: number[] = [];

    function enqueue(x: number, y: number) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const idx = y * width + x;
      if (label[idx] !== 0) return; // 不是背景或已处理
      label[idx] = 1;
      queue.push(idx);
    }

    // 扫描四条边
    for (let x = 0; x < width; x++) {
      enqueue(x, 0); // 上边
      enqueue(x, height - 1); // 下边
    }
    for (let y = 0; y < height; y++) {
      enqueue(0, y); // 左边
      enqueue(width - 1, y); // 右边
    }

    // 洪水扩散
    while (queue.length > 0) {
      const idx = queue.shift()!;
      const x = idx % width;
      const y = Math.floor(idx / width);
      enqueue(x - 1, y);
      enqueue(x + 1, y);
      enqueue(x, y - 1);
      enqueue(x, y + 1);
    }

    // 将所有仍为 0 的像素（内部孔洞）改为人像
    const result = new Float32Array(maskData.length);
    for (let i = 0; i < label.length; i++) {
      if (label[i] === 0) {
        result[i] = 1; // 内部孔洞 → 人物
      } else {
        result[i] = maskData[i];
      }
    }
    return result;
  }

  return {
    fillInternalHoles,
    dilate,
    erode,
    applyClosing,
    applyTemporalSmooth,
    drawMaskAntialiased,
    getMaskCanvas,
  };
}
