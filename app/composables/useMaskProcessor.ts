// composables/useImageProcessor.ts

/**
 * 二值化：将蒙版按阈值转为 0 或 255
 * @param maskData - 原始置信度数组（0~255）
 * @param threshold - 阈值，默认 204（对应置信度 0.8）
 * @returns 二值化后的 Uint8Array，参数无效时返回原数组
 */
function binarize(maskData: Uint8Array, threshold = 204): Uint8Array {
  if (!(maskData instanceof Uint8Array)) {
    console.error("[binarize] maskData must be a Uint8Array");
    return maskData;
  }
  if (typeof threshold !== "number" || threshold < 0 || threshold > 255) {
    console.error("[binarize] threshold must be a number between 0 and 255");
    return maskData;
  }

  const out = new Uint8Array(maskData.length);
  for (let i = 0; i < maskData.length; i++) {
    out[i] = (maskData[i] ?? 0 > threshold) ? 255 : 0;
  }
  return out;
}

/**
 * 膨胀：将内核范围内任何非零像素扩展为 255
 */
function dilate(
  data: Uint8Array,
  width: number,
  height: number,
  kernelSize: number,
): Uint8Array {
  if (!(data instanceof Uint8Array)) {
    console.error("[dilate] data must be a Uint8Array");
    return data;
  }
  if (
    width <= 0 ||
    height <= 0 ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  ) {
    console.error("[dilate] width and height must be positive integers");
    return data;
  }
  if (data.length !== width * height) {
    console.error(
      `[dilate] data length (${data.length}) does not match width*height (${width * height})`,
    );
    return data;
  }
  if (!Number.isInteger(kernelSize) || kernelSize < 3 || kernelSize % 2 === 0) {
    console.error("[dilate] kernelSize must be an odd integer >= 3");
    return data;
  }

  const half = Math.floor(kernelSize / 2);
  const out = new Uint8Array(data.length);
  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let max = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const idx = (y + ky) * width + (x + kx);
          if (!data[idx]) {
            continue;
          } else if (data[idx] > max) {
            max = data[idx];
          }
        }
      }
      out[y * width + x] = max;
    }
  }
  return out;
}

/**
 * 腐蚀：如果内核范围内有任何像素为 0，则输出 0
 */
function erode(
  data: Uint8Array,
  width: number,
  height: number,
  kernelSize: number,
): Uint8Array {
  if (!(data instanceof Uint8Array)) {
    console.error("[erode] data must be a Uint8Array");
    return data;
  }
  if (
    width <= 0 ||
    height <= 0 ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  ) {
    console.error("[erode] width and height must be positive integers");
    return data;
  }
  if (data.length !== width * height) {
    console.error(
      `[erode] data length (${data.length}) does not match width*height (${width * height})`,
    );
    return data;
  }
  if (!Number.isInteger(kernelSize) || kernelSize < 3 || kernelSize % 2 === 0) {
    console.error("[erode] kernelSize must be an odd integer >= 3");
    return data;
  }

  const half = Math.floor(kernelSize / 2);
  const out = new Uint8Array(data.length);
  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let min = 255;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const idx = (y + ky) * width + (x + kx);
          if (!data[idx]) {
            continue;
          } else if (data[idx] < min) {
            min = data[idx];
          }
        }
      }
      out[y * width + x] = min;
    }
  }
  return out;
}

/**
 * 闭运算：先膨胀后腐蚀，可填充小空洞、连接邻近区域
 * @param maskData - 二值蒙版数组（0 或 255）
 * @param width - 图像宽度
 * @param height - 图像高度
 * @param kernelSize - 结构元素大小（奇数，默认 3）
 * @returns 处理后的 Uint8Array，参数无效时返回原数组
 */
function closing(
  maskData: Uint8Array,
  width: number,
  height: number,
  kernelSize = 3,
): Uint8Array {
  // 基础校验
  if (!(maskData instanceof Uint8Array)) {
    console.error("[closing] maskData must be a Uint8Array");
    return maskData;
  }
  if (
    width <= 0 ||
    height <= 0 ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  ) {
    console.error("[closing] width and height must be positive integers");
    return maskData;
  }
  if (maskData.length !== width * height) {
    console.error(
      `[closing] maskData length (${maskData.length}) does not match width*height (${width * height})`,
    );
    return maskData;
  }
  if (!Number.isInteger(kernelSize) || kernelSize < 3 || kernelSize % 2 === 0) {
    console.error("[closing] kernelSize must be an odd integer >= 3");
    return maskData;
  }

  const dilated = dilate(maskData, width, height, kernelSize);
  return erode(dilated, width, height, kernelSize);
}

/**
 * 开运算：先腐蚀后膨胀，可消除细小噪点
 */
function opening(
  maskData: Uint8Array,
  width: number,
  height: number,
  kernelSize = 3,
): Uint8Array {
  // 基础校验
  if (!(maskData instanceof Uint8Array)) {
    console.error("[opening] maskData must be a Uint8Array");
    return maskData;
  }
  if (
    width <= 0 ||
    height <= 0 ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  ) {
    console.error("[opening] width and height must be positive integers");
    return maskData;
  }
  if (maskData.length !== width * height) {
    console.error(
      `[opening] maskData length (${maskData.length}) does not match width*height (${width * height})`,
    );
    return maskData;
  }
  if (!Number.isInteger(kernelSize) || kernelSize < 3 || kernelSize % 2 === 0) {
    console.error("[opening] kernelSize must be an odd integer >= 3");
    return maskData;
  }

  const eroded = erode(maskData, width, height, kernelSize);
  return dilate(eroded, width, height, kernelSize);
}

export function useImageProcessor() {
  return {
    binarize,
    dilate,
    erode,
    closing,
    opening,
  };
}
