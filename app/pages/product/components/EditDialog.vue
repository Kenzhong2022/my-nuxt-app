<template>
  <!-- 编辑商品弹窗 -->
  <el-dialog
    :model-value="visible"
    title="编辑商品"
    width="640px"
    destroy-on-close
    @update:model-value="(val) => emit('update:visible', val)"
  >
    <el-form :model="editForm" label-width="90px">
      <el-form-item label="商品名称" required>
        <el-input v-model="editForm.name" placeholder="请输入商品名称" />
      </el-form-item>
      <el-form-item label="标题" required>
        <el-input v-model="editForm.title" placeholder="请输入商品标题" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="editForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入商品描述"
        />
      </el-form-item>
      <div class="form-row">
        <el-form-item label="价格" required>
          <el-input-number
            v-model="editForm.price"
            :min="0"
            :precision="2"
            :step="1"
          />
        </el-form-item>
        <el-form-item label="原价">
          <el-input-number
            v-model="editForm.originalPrice"
            :min="0"
            :precision="2"
            :step="1"
          />
        </el-form-item>
      </div>
      <div class="form-row">
        <el-form-item label="分类">
          <el-input v-model="editForm.category" placeholder="请输入分类" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="editForm.stock" :min="0" :step="1" />
        </el-form-item>
      </div>
      <el-form-item label="标签">
        <el-select
          v-model="editForm.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入后回车添加标签"
        />
      </el-form-item>
      <el-form-item label="商品图片">
        <div class="image-edit">
          <el-image
            v-if="editForm.image"
            :src="
              cloudinaryUrl(editForm.image, 'w_160,h_160,c_fill,q_auto,f_webp')
            "
            fit="cover"
            class="edit-image"
            :preview-src-list="[editForm.image]"
            preview-teleported
            @load="() => console.log('图片加载成功:')"
            @error="() => console.error('图片加载失败:')"
          />
          <div v-else class="image-placeholder">无图</div>
          <!-- 现阶段调用固定提示词生图，后续可扩展为自定义提示词输入 -->
          <el-button
            type="warning"
            :loading="regenerating"
            @click="handleRegenerateImage"
          >
            AI 生图替换
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveEdit">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { Product } from "~~/types/product";
import { ElMessage, ElMessageBox } from "element-plus";

/**
 * 商品编辑弹窗组件
 * @description 表单回填、保存商品信息、AI 生图替换商品图
 */
const props = defineProps<{
  /** 弹窗显示状态（v-model:visible） */
  visible: boolean;
  /** 当前编辑的商品，null 时弹窗不可保存 */
  product: Product | null;
}>();

const emit = defineEmits<{
  /** 同步弹窗显示状态 */
  (e: "update:visible", val: boolean): void;
  /** 保存成功，父组件据此刷新列表 */
  (e: "saved"): void;
}>();

const saving = ref(false);
const regenerating = ref(false);
/** 待保存的 AI 生图 base64（data URL），保存时随 PUT 提交，取消则丢弃 */
const pendingImage = ref<string | null>(null);
const editForm = reactive({
  name: "",
  title: "",
  description: "",
  price: 0,
  originalPrice: null as number | null,
  category: "",
  stock: 0,
  tags: [] as string[],
  image: "",
});

// 弹窗打开时用商品数据回填表单，并丢弃上次未保存的生图
watch(
  () => props.visible,
  (val) => {
    if (val && props.product) {
      const row = props.product;
      pendingImage.value = null;
      Object.assign(editForm, {
        name: row.name,
        title: row.title,
        description: row.description ?? "",
        price: row.price,
        originalPrice: row.originalPrice ?? null,
        category: row.category ?? "",
        stock: row.stock ?? 0,
        tags: [...(row.tags ?? [])],
        image: row.image,
      });
    }
  },
);

/**
 * 保存编辑，成功后关闭弹窗并通知父组件
 */
async function saveEdit() {
  if (!props.product) return;
  if (!editForm.name.trim() || !editForm.title.trim()) {
    ElMessage.warning("商品名称和标题不能为空");
    return;
  }
  saving.value = true;
  try {
    // 有 AI 生图预览时：base64 转 Blob → 直传 Cloudinary → 拿到 secure_url
    let imageUrl: string | undefined;
    if (pendingImage.value) {
      const blob = await (await fetch(pendingImage.value)).blob();
      const sig = await $fetch<{
        code: number;
        message: string;
        data: DirectUploadSignature | null;
      }>("/api/admin/upload-signature", { method: "POST" });
      if (sig.code !== 200 || !sig.data) {
        throw new Error(sig.message || "获取上传签名失败");
      }
      imageUrl = await uploadImageDirect(blob, sig.data);
    }

    const res = await $fetch(`/api/admin/products/${props.product.id}`, {
      method: "PUT",
      body: {
        name: editForm.name,
        title: editForm.title,
        description: editForm.description,
        price: editForm.price,
        originalPrice: editForm.originalPrice,
        category: editForm.category,
        stock: editForm.stock,
        tags: editForm.tags,
        // 有新图时传 Cloudinary URL，服务端写库；无则不改动图片
        imageUrl,
      },
    });
    if (res.code === 200) {
      pendingImage.value = null;
      ElMessage.success("保存成功");
      emit("update:visible", false);
      emit("saved");
    } else {
      ElMessage.error(res.message || "保存失败");
    }
  } catch (err) {
    console.error("保存商品失败:", err);
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

/**
 * AI 生图（仅生成本地预览，不上传不入库）
 * @description 生图接口返回 base64 直接展示，可反复生成；
 *              点击"保存"时才上传 Cloudinary 并写回数据库，取消则丢弃
 */
async function handleRegenerateImage() {
  if (!props.product) return;
  try {
    await ElMessageBox.confirm(
      "将使用 AI 重新生成商品主图（仅预览，点击保存后生效），是否继续？",
      "AI 生图",
      {
        confirmButtonText: "开始生成",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return; // 用户取消
  }
  regenerating.value = true;
  await $fetch(`/api/admin/products/${props.product.id}/regenerate-images`, {
    method: "POST",
  })
    .then((res) => {
      if (res.data) {
        // base64 data URL，仅用于预览展示
        editForm.image = res.data.image;
        pendingImage.value = res.data.image;
        ElMessage.success("图片已生成，保存后生效");
      }
    })
    .finally(() => {
      regenerating.value = false;
    });
}
</script>

<style scoped>
/* 两个字段同行排列 */
.form-row {
  display: flex;
  gap: 16px;
}

.form-row .el-form-item {
  flex: 1;
}

/* 图片预览 + 生图按钮 */
.image-edit {
  display: flex;
  align-items: center;
  gap: 16px;
}

.edit-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
}
</style>
