// composables/useCanvasManager.ts
export function useCanvasManager() {
  /**
   * 同步多个 Canvas 的尺寸与视频原始分辨率
   * @param video - 视频元素
   * @param canvases - 需要同步的 Canvas 元素列表
   * @returns  实际宽高，单位像素{ width, height }
   */
  function syncSize(
    video: HTMLVideoElement,
    canvases: HTMLCanvasElement[] = [],
  ) {
    const width = video.videoWidth || video.clientWidth || 500;
    const height = video.videoHeight || video.clientHeight || 500;
    if (!canvases || canvases.length === 0) {
      throw new Error("canvases 不能为空");
    }

    canvases.forEach((canvas) => {
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
    });

    return { width, height };
  }

  return { syncSize };
}
