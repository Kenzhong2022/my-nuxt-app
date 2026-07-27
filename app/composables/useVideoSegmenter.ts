// composables/useVideoSegmenter.ts
import { ref, readonly } from "vue";
import {
  ImageSegmenter,
  FilesetResolver,
  type ImageSegmenterResult,
} from "@mediapipe/tasks-vision";

/**
 * @description 他是一个视频分割器实例，用于对视频帧进行分割
 * @description 它包含初始化、分割帧、释放资源等方法
 * @returns 视频分割器实例
 */
export function useVideoSegmenter() {
  const segmenter = ref<ImageSegmenter | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  /**
   * 初始化分割器
   * @param modelPath - 模型文件路径
   * @param delegate - 'GPU' 或 'CPU'
   */
  async function init(modelPath?: string, delegate: "GPU" | "CPU" = "GPU") {
    // 模型路径（多分类）
    const MODEL_PATH =
      "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
    if (!modelPath) {
      modelPath = MODEL_PATH;
    }
    let vision;
    try {
      vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
      );
      console.log("WasmFileset 创建成功:", vision);
    } catch (err) {
      console.error("WasmFileset 加载失败:", err);
      throw err;
    }
    try {
      segmenter.value = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
      });
      loading.value = false;
      error.value = null;
      console.info("segmentFrame: 视频分割器初始化成功", segmenter.value);
      return segmenter.value;
    } catch (err) {
      console.error("segmentFrame: 视频分割器初始化失败:", err);
      loading.value = false;
      error.value = err as Error;
      throw err;
    }
  }

  /**
   * 对视频帧进行分割（仅支持 VIDEO 模式）
   * @param  video - 视频元素，必须已加载有效视频源
   * @param  timestamp - 当前帧的时间戳（毫秒），须为正数且单调递增
   * @returns 分割结果，若校验失败则返回 null
   */
  function segmentFrame(
    video: HTMLVideoElement,
    timestamp: number,
  ): ImageSegmenterResult | null {
    // -------- 1. 检查 segmenter 是否存在且模式正确 --------
    const seg = segmenter.value;
    if (!seg) {
      console.warn("segmentFrame: 分割器未初始化");
      return null;
    }

    // -------- 2. 校验 video 参数 --------
    if (!(video instanceof HTMLVideoElement)) {
      console.warn("segmentFrame: video 参数不是 HTMLVideoElement 实例");
      return null;
    }
    // 检查视频是否已加载足够数据（至少有一帧可读）
    if (video.readyState < 2) {
      console.warn("segmentFrame: 视频尚未加载到当前帧 (readyState < 2)");
      return null;
    }
    // 可选：检查视频尺寸是否有效（防止零宽高导致分割异常）
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("segmentFrame: 视频尺寸为 0，可能未加载元数据");
      return null;
    }

    // -------- 3. 校验 timestamp 参数 --------
    if (typeof timestamp !== "number" || !isFinite(timestamp)) {
      console.warn("segmentFrame: timestamp 必须是有限数字");
      return null;
    }
    if (timestamp < 0) {
      console.warn("segmentFrame: timestamp 不能为负数");
      return null;
    }
    // 建议：如果传入的 timestamp 不递增，可仅警告而不阻断（因为 MediaPipe 可能容忍）
    // 但为了更严格，可加上缓存上一次的值进行比较（需自行维护 lastTimestamp）
    // 这里仅做基础检查

    // -------- 4. 调用分割 API --------
    try {
      return seg.segmentForVideo(video, timestamp);
    } catch (e) {
      console.error("segmentFrame: 分割帧失败:", e);
      throw e;
    }
  }
  /**
   * 释放资源
   */
  function close() {
    if (segmenter.value) {
      try {
        segmenter.value.close();
      } catch (e) {
        /* ignore */
      }
      segmenter.value = null;
    }
  }

  return {
    segmenter: readonly(segmenter),
    loading: readonly(loading),
    error: readonly(error),
    init,
    segmentFrame,
    close,
  };
}
