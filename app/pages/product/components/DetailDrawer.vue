<template>
  <!-- 编辑商品详情抽屉 -->
  <el-drawer
    :model-value="visible"
    :title="`编辑商品详情${product ? ` - ${product.name}` : ''}`"
    size="720px"
    destroy-on-close
    :before-close="handleClose"
    @update:model-value="(val) => emit('update:visible', val)"
  >
    <div v-loading="loading" class="drawer-body">
      <el-form label-width="90px">
        <el-form-item label="图集">
          <div class="gallery-edit">
            <!-- 拖拽排序 + 删除 + 点击预览 -->
            <VueDraggable
              v-model="detailForm.gallery"
              :animation="150"
              :item-key="(_: string, index: number) => String(index)"
              class="gallery-grid"
            >
              <div
                v-for="(img, index) in detailForm.gallery"
                :key="img"
                class="gallery-item"
              >
                <el-image
                  :src="cloudinaryUrl(img, 'w_120,h_120,c_fill,q_auto,f_webp')"
                  :alt="`图集-${index + 1}`"
                  fit="cover"
                  class="gallery-img"
                  :preview-src-list="detailForm.gallery"
                  :initial-index="index"
                  preview-teleported
                >
                  <template #error>
                    <div class="image-placeholder">无图</div>
                  </template>
                </el-image>
                <el-icon
                  class="gallery-remove"
                  :size="16"
                  @click.stop="removeGallery(index)"
                >
                  <CircleClose />
                </el-icon>
                <el-icon class="gallery-drag-handle" :size="14">
                  <Rank />
                </el-icon>
              </div>
            </VueDraggable>
            <!-- 上传 / AI 生成 触发卡片（直传或生图成功后仅加入本地数组，保存才落库） -->
            <div class="gallery-actions">
              <el-upload
                accept="image/*"
                :show-file-list="false"
                :http-request="handleUpload"
                class="gallery-upload"
              >
                <div v-loading="uploading" class="upload-trigger">
                  <el-icon :size="20"><Plus /></el-icon>
                  <span>上传图片</span>
                </div>
              </el-upload>
              <div class="upload-trigger ai-trigger" @click="openAiGenerate">
                <el-icon :size="20"><MagicStick /></el-icon>
                <span>AI 生成</span>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="商品规格">
          <div class="specs-edit">
            <div v-for="(row, index) in specRows" :key="index" class="spec-row">
              <el-input
                v-model="row.key"
                placeholder="规格名（如：产地）"
                style="width: 160px"
              />
              <el-input
                v-model="row.value"
                placeholder="规格值（如：云南）"
                style="flex: 1"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                @click="specRows.splice(index, 1)"
              />
            </div>
            <el-button type="primary" plain :icon="Plus" @click="addSpecRow">
              添加规格
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="商品亮点">
          <el-select
            v-model="detailForm.highlights"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入后回车添加，如：新鲜直达"
          />
        </el-form-item>
        <el-form-item label="包装清单">
          <el-select
            v-model="detailForm.packaging"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入后回车添加，如：泡沫箱 × 1"
          />
        </el-form-item>
        <el-form-item label="售后保障">
          <el-select
            v-model="detailForm.services"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入后回车添加，如：7 天无理由退货"
          />
        </el-form-item>
        <el-form-item label="详情内容">
          <el-input
            v-model="detailForm.detailContent"
            type="textarea"
            :rows="8"
            placeholder="请输入商品详情图文内容"
          />
        </el-form-item>
        <el-form-item label="浏览量">
          <el-tag type="info" disable-transitions>
            {{ detailForm.viewCount }}（系统统计，不可编辑）
          </el-tag>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveDetail">
        保存
      </el-button>
    </template>

    <!-- AI 生图弹窗：下拉切换图片类型，各自提示词可修改后反复生成 -->
    <el-dialog
      v-model="aiVisible"
      title="AI 生成图集图片"
      width="560px"
      append-to-body
    >
      <el-select
        v-model="aiActiveType"
        v-loading="aiPromptLoading"
        placeholder="正在加载图片类型..."
        style="width: 100%; margin-bottom: 12px"
      >
        <el-option
          v-for="p in aiPrompts"
          :key="p.type"
          :label="p.label"
          :value="p.type"
        />
      </el-select>
      <el-input
        v-if="activePromptItem"
        v-model="activePromptItem.prompt"
        type="textarea"
        :rows="5"
        placeholder="请输入提示词"
      />
      <div class="ai-dialog-footer-tip">
        <el-button
          link
          type="primary"
          size="small"
          :disabled="!activePromptItem"
          @click="resetActivePrompt"
        >
          恢复默认提示词
        </el-button>
        <span class="ai-hint">可修改提示词后多次生成，图片将追加到图集</span>
      </div>
      <template #footer>
        <el-button @click="aiVisible = false">完成</el-button>
        <el-button
          type="warning"
          :loading="aiGenerating"
          :disabled="!activePromptItem?.prompt.trim()"
          @click="handleAiGenerate"
        >
          生成图片
        </el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus";
import {
  CircleClose,
  Delete,
  MagicStick,
  Plus,
  Rank,
} from "@element-plus/icons-vue";
import type { UploadRequestOptions } from "element-plus";
import type { Product } from "~~/types/product";
import { ElMessage, ElMessageBox } from "element-plus";

/**
 * 商品详情编辑抽屉组件
 * @description 打开时懒加载详情（图集/规格/亮点/包装/售后/图文），支持拖拽排序、
 *              图片直传 Cloudinary、未保存关闭二次确认，保存后整体 UPSERT 落库
 */
const props = defineProps<{
  /** 抽屉显示状态（v-model:visible） */
  visible: boolean;
  /** 当前编辑的商品（仅用其 id / name），null 时不可保存 */
  product: Product | null;
}>();

const emit = defineEmits<{
  /** 同步抽屉显示状态 */
  (e: "update:visible", val: boolean): void;
}>();

/** AI 生图图片类型提示词项 */
interface AiPromptItem {
  type: string;
  label: string;
  prompt: string;
}

const loading = ref(false);
const uploading = ref(false);
const saving = ref(false);
/** 是否有未保存的修改，用于关闭前二次确认 */
const dirty = ref(false);

// AI 生图弹窗状态
const aiVisible = ref(false);
/** 各图片类型的提示词（服务端默认值回填，用户可分别修改） */
const aiPrompts = ref<AiPromptItem[]>([]);
/** 当前选中的图片类型 */
const aiActiveType = ref("");
/** type → 服务端默认提示词，用于单类型恢复 */
const defaultPromptMap = ref<Record<string, string>>({});
const aiPromptLoading = ref(false);
const aiGenerating = ref(false);

/** 当前选中类型的提示词项 */
const activePromptItem = computed(() =>
  aiPrompts.value.find((p) => p.type === aiActiveType.value),
);

const detailForm = reactive({
  gallery: [] as string[],
  detailContent: "",
  highlights: [] as string[],
  packaging: [] as string[],
  services: [] as string[],
  viewCount: 0,
});

/** specs 为 Record，编辑时转为行数组便于增删 */
const specRows = ref<{ key: string; value: string }[]>([]);

// 任意字段变化即视为脏数据（回填触发的变更会在 nextTick 后复位）
watch([detailForm, specRows], () => (dirty.value = true), { deep: true });

// 抽屉打开时懒加载详情并回填（列表接口不返回详情，避免列表变重）
watch(
  () => props.visible,
  async (val) => {
    if (!val || !props.product) return;
    loading.value = true;
    try {
      const res = await $fetch<{
        code: number;
        message: string;
        data: import("~~/types/product").ProductDetail | null;
      }>(`/api/public/products/${props.product.id}`);
      if (res.code !== 200 || !res.data) {
        ElMessage.error(res.message || "获取商品详情失败");
        emit("update:visible", false);
        return;
      }
      const d = res.data;
      detailForm.gallery = [...(d.gallery ?? [])];
      detailForm.detailContent = d.detailContent ?? "";
      detailForm.highlights = [...(d.highlights ?? [])];
      detailForm.packaging = [...(d.packaging ?? [])];
      detailForm.services = [...(d.services ?? [])];
      detailForm.viewCount = d.viewCount ?? 0;
      specRows.value = Object.entries(d.specs ?? {}).map(([key, value]) => ({
        key,
        value,
      }));
      // 等待回填触发的 deep watcher 执行完毕后复位脏标记
      await nextTick();
      dirty.value = false;
    } catch (err) {
      console.error("获取商品详情失败:", err);
      ElMessage.error("获取商品详情失败");
      emit("update:visible", false);
    } finally {
      loading.value = false;
    }
  },
);

function addSpecRow() {
  specRows.value.push({ key: "", value: "" });
}

function removeGallery(index: number) {
  detailForm.gallery.splice(index, 1);
}

/**
 * 上传图片到图集：签名 → 浏览器直传 Cloudinary → 仅追加本地数组，保存时才落库
 */
async function handleUpload(options: UploadRequestOptions) {
  uploading.value = true;
  try {
    const sig = await $fetch<{
      code: number;
      message: string;
      data: DirectUploadSignature | null;
    }>("/api/admin/upload-signature", { method: "POST" });
    if (sig.code !== 200 || !sig.data) {
      throw new Error(sig.message || "获取上传签名失败");
    }
    const url = await uploadImageDirect(options.file, sig.data);
    detailForm.gallery.push(url);
    ElMessage.success("图片已上传，保存后生效");
  } catch (err) {
    console.error("上传图集图片失败:", err);
    ElMessage.error("上传图片失败");
  } finally {
    uploading.value = false;
  }
}

/**
 * 打开 AI 生图弹窗，首次打开加载各类型默认提示词（用户修改过的保留）
 */
function openAiGenerate() {
  aiVisible.value = true;
  if (!aiPrompts.value.length) loadDefaultPrompts();
}

/**
 * 加载各类型默认提示词（服务端按商品英文名 + 类型模板构建）
 */
async function loadDefaultPrompts() {
  if (!props.product) return;
  aiPromptLoading.value = true;
  try {
    const res = await $fetch<{
      code: number;
      message: string;
      data: { prompts: AiPromptItem[] } | null;
    }>(`/api/admin/products/${props.product.id}/gallery-prompts`);
    if (res.code === 200 && res.data?.prompts?.length) {
      aiPrompts.value = res.data.prompts.map((p) => ({ ...p }));
      // 已选中类型被保留，否则默认选第一个
      if (!aiPrompts.value.some((p) => p.type === aiActiveType.value)) {
        aiActiveType.value = aiPrompts.value[0]?.type ?? "";
      }
      defaultPromptMap.value = Object.fromEntries(
        res.data.prompts.map((p) => [p.type, p.prompt]),
      );
    } else {
      ElMessage.error(res.message || "获取默认提示词失败");
    }
  } catch (err) {
    console.error("获取默认提示词失败:", err);
    ElMessage.error("获取默认提示词失败");
  } finally {
    aiPromptLoading.value = false;
  }
}

/**
 * 恢复当前类型的服务端默认提示词（不影响其他类型的修改）
 */
function resetActivePrompt() {
  const item = activePromptItem.value;
  if (item) item.prompt = defaultPromptMap.value[item.type] ?? "";
}

/**
 * 按当前类型提示词 AI 生图：base64 仅追加到图集预览，保存时才上传 Cloudinary 入库
 */
async function handleAiGenerate() {
  const item = activePromptItem.value;
  if (!props.product || !item?.prompt.trim()) return;
  aiGenerating.value = true;
  try {
    const res = await $fetch<{
      code: number;
      message: string;
      data: { image: string } | null;
    }>(`/api/admin/products/${props.product.id}/generate-gallery`, {
      method: "POST",
      body: { prompt: item.prompt.trim(), type: item.type },
    });
    if (res.code === 200 && res.data?.image) {
      detailForm.gallery.push(res.data.image);
      ElMessage.success("已生成并加入图集，保存后生效");
    } else {
      ElMessage.error(res.message || "生成失败");
    }
  } catch (err) {
    console.error("AI 生成图集图片失败:", err);
    ElMessage.error("生成失败");
  } finally {
    aiGenerating.value = false;
    aiVisible.value = false;
  }
}

/**
 * 关闭前守卫：有未保存修改时二次确认
 */
function handleClose(done: () => void) {
  if (!dirty.value) {
    done();
    return;
  }
  ElMessageBox.confirm("修改尚未保存，确定离开？", "未保存提示", {
    confirmButtonText: "离开",
    cancelButtonText: "继续编辑",
    type: "warning",
  })
    .then(() => done())
    .catch(() => {});
}

/**
 * 保存详情：specs 行数组拼回对象（重名校验）后整体提交
 */
async function saveDetail() {
  if (!props.product) return;
  const specs: Record<string, string> = {};
  for (const row of specRows.value) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key && !value) continue; // 整行为空直接忽略
    if (!key || !value) {
      ElMessage.warning("规格名和规格值需成对填写");
      return;
    }
    if (specs[key]) {
      ElMessage.warning(`规格名重复：${key}`);
      return;
    }
    specs[key] = value;
  }
  saving.value = true;
  try {
    // 图集中的 data URL（AI 生图）需先直传 Cloudinary 换成 https URL，
    // 服务端只接受 http(s) 链接；已有 URL 原样保留，顺序不变
    let galleryUrls = detailForm.gallery;
    if (detailForm.gallery.some((u) => u.startsWith("data:"))) {
      const sig = await $fetch<{
        code: number;
        message: string;
        data: DirectUploadSignature | null;
      }>("/api/admin/upload-signature", { method: "POST" });
      if (sig.code !== 200 || !sig.data) {
        throw new Error(sig.message || "获取上传签名失败");
      }
      // 签名仅绑定 folder/timestamp 等参数，与文件内容无关，可复用签多张
      const sigData = sig.data;
      galleryUrls = await Promise.all(
        detailForm.gallery.map(async (u) =>
          u.startsWith("data:")
            ? uploadImageDirect(await (await fetch(u)).blob(), sigData)
            : u,
        ),
      );
    }

    const res = await $fetch(`/api/admin/products/${props.product.id}/detail`, {
      method: "PUT",
      body: {
        gallery: galleryUrls,
        detailContent: detailForm.detailContent,
        specs,
        highlights: detailForm.highlights,
        packaging: detailForm.packaging,
        services: detailForm.services,
      },
    });
    if (res.code === 200) {
      dirty.value = false;
      ElMessage.success("保存成功");
      emit("update:visible", false);
    } else {
      ElMessage.error(res.message || "保存失败");
    }
  } catch (err) {
    console.error("保存商品详情失败:", err);
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.drawer-body {
  min-height: 200px;
}

/* 图集网格：拖拽排序 + 上传卡片 */
.gallery-edit {
  width: 100%;
}

.gallery-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.gallery-item {
  position: relative;
  width: 100px;
  height: 100px;
}

.gallery-img {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  cursor: move;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
}

/* 悬停删除按钮 */
.gallery-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  padding: 2px;
  color: var(--el-color-danger);
  cursor: pointer;
  background: var(--el-bg-color);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.gallery-item:hover .gallery-remove {
  opacity: 1;
}

/* 拖拽排序提示角标 */
.gallery-drag-handle {
  position: absolute;
  bottom: 2px;
  right: 2px;
  padding: 2px;
  color: #fff;
  cursor: move;
  background: rgb(0 0 0 / 40%);
  border-radius: 2px;
}

.gallery-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.gallery-upload :deep(.el-upload) {
  width: 100px;
  height: 100px;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* AI 生成卡片：与上传卡片同尺寸，可点击 */
.ai-trigger {
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s;
}

.ai-trigger:hover {
  color: var(--el-color-warning);
  border-color: var(--el-color-warning);
}

/* AI 弹窗内提示区 */
.ai-dialog-footer-tip {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
}

.ai-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 规格动态行 */
.specs-edit {
  width: 100%;
}

.spec-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
</style>
