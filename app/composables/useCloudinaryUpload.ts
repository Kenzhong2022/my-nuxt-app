import { useRuntimeConfig } from "#app";

export function useCloudinaryUpload() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase || "http://127.0.0.1:8000";
  // const baseUrl =
  //   config.public.apiBase || "https://chief-agent-alpha.vercel.app";
  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOW_MIME = ["image/jpeg", "image/png", "image/webp"];

  const withTimeout = <T>(promise: Promise<T>, timeout = 15000): Promise<T> => {
    const timeoutTask = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("请求超时，请重试")), timeout),
    );
    return Promise.race([promise, timeoutTask]);
  };

  const uploadSingleImage = async (file: File) => {
    // 本地校验
    if (!ALLOW_MIME.includes(file.type)) {
      throw new Error(`文件 ${file.name} 格式不支持`);
    }
    if (file.size > MAX_SIZE) {
      throw new Error(`文件 ${file.name} 超过5MB`);
    }

    const formData = new FormData();
    formData.append("file", file);

    // 只请求自己后端接口，不直接请求 cloudinary
    const res = await withTimeout(
      fetch(`${baseUrl}/api/v1/cloudinary_img/upload`, {
        method: "POST",
        body: formData,
      }),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "上传失败");
    return data.url;
  };

  const batchUploadImages = async (fileList: File[]) => {
    const urls: string[] = [];
    for (const f of fileList) {
      urls.push(await uploadSingleImage(f));
    }
    return urls;
  };

  return { uploadSingleImage, batchUploadImages };
}
