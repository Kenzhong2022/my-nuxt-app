<!-- 收货地址选择器：列表选择 + 新增/编辑表单 + 设默认/删除，结算页与购物车复用 -->
<template>
  <el-dialog
    :model-value="visible"
    title="选择收货地址"
    width="560px"
    @update:model-value="emit('update:visible', $event)"
  >
    <!-- 表单视图：新增/编辑地址 -->
    <template v-if="formVisible">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="收件人" prop="receiver">
          <el-input v-model="form.receiver" placeholder="姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="11位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="省市区" prop="region">
          <el-input v-model="form.region" placeholder="如：广东省 深圳市 南山区" maxlength="100" />
        </el-form-item>
        <el-form-item label="详细地址" prop="detail">
          <el-input
            v-model="form.detail"
            type="textarea"
            :rows="2"
            placeholder="街道、门牌号等"
            maxlength="200"
          />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
      </el-form>
    </template>

    <!-- 列表视图：选择地址 -->
    <template v-else>
      <div v-loading="loading" class="address-list">
        <el-empty v-if="!loading && !addresses.length" description="还没有收货地址" :image-size="80" />
        <div
          v-for="addr in addresses"
          :key="addr.id"
          class="address-card"
          :class="{ selected: addr.id === selectedId }"
          @click="selectedId = addr.id"
        >
          <div class="address-main">
            <div class="address-line1">
              <span class="receiver">{{ addr.receiver }}</span>
              <span class="phone">{{ addr.phone }}</span>
              <el-tag v-if="addr.isDefault" type="danger" size="small" effect="light">默认</el-tag>
            </div>
            <div class="address-line2">{{ addr.region }} {{ addr.detail }}</div>
          </div>
          <div class="address-actions" @click.stop>
            <el-button link type="primary" size="small" @click="handleEdit(addr)">编辑</el-button>
            <el-button v-if="!addr.isDefault" link size="small" @click="handleSetDefault(addr)">设为默认</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(addr)">删除</el-button>
          </div>
        </div>
      </div>

    </template>

    <!-- 统一 footer：v-slot 只会被组件直接子级提取，嵌套在 v-if 模板内会导致 codegen 报错 -->
    <template #footer>
      <template v-if="formVisible">
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
      <div v-else class="picker-footer">
        <el-button link type="primary" @click="handleCreate">+ 新增地址</el-button>
        <div class="flex gap-2">
          <el-button @click="emit('update:visible', false)">取消</el-button>
          <el-button type="primary" :disabled="!selectedAddress" @click="handleConfirm">
            使用选中地址
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';
import type { StoreAddress, AddressPayload } from '~~/types/address';

const props = defineProps<{
  visible: boolean;
  /** 当前已选地址 id（打开时高亮回显） */
  selected?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'select', addr: StoreAddress): void;
}>();

const { fetchAddresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useStoreAddress();

const loading = ref(false);
const saving = ref(false);
const addresses = ref<StoreAddress[]>([]);
const selectedId = ref<number | null>(null);
const formVisible = ref(false);
const editingId = ref<number | null>(null);

const formRef = ref<FormInstance>();
const form = reactive<AddressPayload>({
  receiver: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false,
});

const formRules: FormRules = {
  receiver: [{ required: true, message: '请输入收件人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  region: [{ required: true, message: '请输入省市区', trigger: 'blur' }],
  detail: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
};

const selectedAddress = computed(() => addresses.value.find((a) => a.id === selectedId.value) ?? null);

/** 拉取地址列表；selected 未命中（如已删除）时回退默认地址 */
async function loadAddresses() {
  loading.value = true;
  try {
    addresses.value = await fetchAddresses();
    const hit = addresses.value.some((a) => a.id === selectedId.value);
    if (!hit) {
      selectedId.value = addresses.value.find((a) => a.isDefault)?.id ?? addresses.value[0]?.id ?? null;
    }
  } catch (e) {
    ElMessage.error((e as Error).message);
  } finally {
    loading.value = false;
  }
}

// 每次打开弹窗：回显选中项并刷新列表
watch(
  () => props.visible,
  (v) => {
    if (v) {
      selectedId.value = props.selected ?? null;
      formVisible.value = false;
      loadAddresses();
    }
  },
);

function handleCreate() {
  editingId.value = null;
  Object.assign(form, { receiver: '', phone: '', region: '', detail: '', isDefault: false });
  formVisible.value = true;
}

function handleEdit(addr: StoreAddress) {
  editingId.value = addr.id;
  Object.assign(form, {
    receiver: addr.receiver,
    phone: addr.phone,
    region: addr.region,
    detail: addr.detail,
    isDefault: addr.isDefault,
  });
  formVisible.value = true;
}

/** 保存地址（新增或编辑），成功后刷新列表并关闭表单视图 */
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    if (editingId.value) {
      await updateAddress(editingId.value, { ...form });
      ElMessage.success('地址已更新');
    } else {
      const created = await addAddress({ ...form });
      selectedId.value = created.id; // 新建的地址直接选中
      ElMessage.success('地址已添加');
    }
    formVisible.value = false;
    await loadAddresses();
  } catch (e) {
    ElMessage.error((e as Error).message);
  } finally {
    saving.value = false;
  }
}

async function handleSetDefault(addr: StoreAddress) {
  try {
    await setDefaultAddress(addr.id);
    selectedId.value = addr.id;
    await loadAddresses();
  } catch (e) {
    ElMessage.error((e as Error).message);
  }
}

async function handleDelete(addr: StoreAddress) {
  try {
    await ElMessageBox.confirm(`确定删除「${addr.receiver}」的地址吗？`, '提示', { type: 'warning' });
  } catch {
    return; // 用户取消
  }
  try {
    await removeAddress(addr.id);
    if (selectedId.value === addr.id) selectedId.value = null;
    await loadAddresses();
  } catch (e) {
    ElMessage.error((e as Error).message);
  }
}

function handleConfirm() {
  if (!selectedAddress.value) return;
  emit('select', selectedAddress.value);
  emit('update:visible', false);
}
</script>

<style scoped>
.address-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
}

.address-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  transition: border-color 0.2s;
}

.address-card:hover {
  border-color: var(--el-color-primary);
}

.address-card.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.address-main {
  min-width: 0;
}

.address-line1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.receiver {
  font-weight: 600;
}

.phone {
  color: var(--el-text-color-secondary);
}

.address-line2 {
  font-size: 13px;
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.address-actions {
  flex-shrink: 0;
}

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
