<template>
  <el-dialog v-model="visible" :title="title" :width="width" destroy-on-close @closed="handleClosed">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-width="labelWidth"
      :validate-on-rule-change="false"
      @submit.prevent
    >
      <el-form-item v-for="field in schema.fields" :key="field.key" :label="field.label" :prop="field.key">
        <!-- 输入框 -->
        <el-input
          v-if="field.type === 'input'"
          v-model="formData[field.key]"
          :placeholder="field.placeholder"
          v-bind="field.props || {}"
          clearable
        />

        <!-- 数字输入 -->
        <el-input-number v-else-if="field.type === 'number'" v-model="formData[field.key]" v-bind="field.props || {}" />

        <!-- 下拉选择 -->
        <el-select
          v-else-if="field.type === 'select'"
          v-model="formData[field.key]"
          :placeholder="field.placeholder || '请选择'"
          v-bind="field.props || {}"
          clearable
        >
          <el-option v-for="opt in field.options" :key="String(opt.value)" :label="opt.label" :value="opt.value" />
        </el-select>

        <!-- 单选框组（按钮样式） -->
        <el-radio-group
          v-else-if="field.type === 'button'"
          v-model="formData[field.key]"
          fill="#409eff"
          @change="handleFieldChange(field)"
        >
          <el-radio-button v-for="opt in field.options" :key="String(opt.value)" :value="opt.value">
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>

        <!-- 单选框组 -->
        <el-radio-group
          v-else-if="field.type === 'radio'"
          v-model="formData[field.key]"
          @change="handleFieldChange(field)"
        >
          <el-radio v-for="opt in field.options" :key="String(opt.value)" :value="opt.value">
            {{ opt.label }}
          </el-radio>
        </el-radio-group>

        <!-- 开关 -->
        <el-switch
          v-else-if="field.type === 'switch'"
          v-model="formData[field.key]"
          v-bind="field.props || {}"
          @change="handleFieldChange(field)"
        />

        <!-- 文本域 -->
        <el-input
          v-else-if="field.type === 'textarea'"
          v-model="formData[field.key]"
          type="textarea"
          :placeholder="field.placeholder"
          v-bind="field.props || {}"
        />

        <!-- 未知类型提示 -->
        <span v-else class="unsupported-type">未支持的控件类型：{{ field.type }}</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="confirmLoading" @click="handleSubmit">
        {{ schema.submitText || '确定' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { FormInstance, FormItemRule } from 'element-plus';
import type { FormSchema, FieldConfig, FieldRule } from '~~/types/dynamicForm';

/**
 * 通用表单弹窗
 * - 表单配置（schema.fields）完全由父组件传入，字段渲染约定与 DynamicForm 一致
 * - 通过 ref 调用 open(initial?) / close() 控制显示隐藏
 * - 校验通过后打印表单数据并 emit('submit', data)，由父组件消费
 */
const props = withDefaults(
  defineProps<{
    /** 弹窗标题 */
    title?: string;
    /** 表单配置（复用 DynamicForm 的 FormSchema 类型，submitText 作为确定按钮文案） */
    schema: FormSchema;
    /** 弹窗宽度 */
    width?: string;
    /** 表单 label 宽度 */
    labelWidth?: string;
    /** 确定按钮 loading 态（父组件异步提交时传入） */
    confirmLoading?: boolean;
  }>(),
  {
    title: '',
    width: '520px',
    labelWidth: '100px',
    confirmLoading: false,
  },
);

const emit = defineEmits<{
  /** 校验通过后上报表单数据 */
  submit: [data: Record<string, any>];
  /** 字段值变化（如 radio 切换），父组件可据此动态调整 schema 与标题 */
  fieldChange: [key: string, value: any];
}>();

const visible = ref(false);
const formRef = ref<FormInstance>();
/** 表单数据（open 时按 schema 重建，避免残留上次填写） */
const formData = ref<Record<string, any>>({});

/**
 * 打开弹窗并初始化表单数据
 * @param initial 初始值（优先级高于字段 defaultValue），如编辑回填
 */
function open(initial: Record<string, any> = {}): void {
  const data: Record<string, any> = {};
  for (const field of props.schema.fields) {
    data[field.key] = initial[field.key] ?? field.defaultValue ?? '';
  }
  formData.value = data;
  visible.value = true;
  nextTick(() => formRef.value?.clearValidate());
}

/** 关闭弹窗 */
function close(): void {
  visible.value = false;
}

/** 弹窗关闭动画结束后清除校验状态 */
function handleClosed(): void {
  formRef.value?.clearValidate();
}

/**
 * 控件 change 转发：v-model 先更新，此处读取的已是新值
 * @param field 发生变化的字段配置
 */
function handleFieldChange(field: FieldConfig): void {
  emit('fieldChange', field.key, formData.value[field.key]);
}

// schema 动态变化（父组件按字段联动增删字段）时同步表单数据：
// 保留用户已填写的字段值，新增字段补默认值，已移除字段不再保留
watch(
  () => props.schema,
  () => {
    if (!visible.value) return;
    const next: Record<string, any> = {};
    for (const field of props.schema.fields) {
      next[field.key] = formData.value[field.key] ?? field.defaultValue ?? '';
    }
    formData.value = next;
  },
  { deep: true },
);

/**
 * 转换单个字段配置为 el-form 校验规则
 * @param field 字段配置
 */
function convertRules(field: FieldConfig): FormItemRule[] {
  const rules: FormItemRule[] = [];
  const fieldRules: FieldRule | undefined = field.rules;
  if (!fieldRules) return rules;

  const trigger = fieldRules.trigger || 'blur';
  if (fieldRules.required) {
    rules.push({ required: true, message: `${field.label}不能为空`, trigger });
  }
  if (fieldRules.pattern) {
    rules.push({
      pattern: new RegExp(fieldRules.pattern),
      message: fieldRules.message || `${field.label}格式不正确`,
      trigger,
    });
  }
  if (fieldRules.min !== undefined || fieldRules.max !== undefined) {
    rules.push({ min: fieldRules.min, max: fieldRules.max, message: fieldRules.message, trigger });
  }
  if (fieldRules.len !== undefined) {
    rules.push({ len: fieldRules.len, message: fieldRules.message, trigger });
  }
  return rules;
}

/** 汇总所有字段的校验规则（schema 由父组件控制，computed 随之更新） */
const formRules = computed<Record<string, FormItemRule[]>>(() => {
  const rules: Record<string, FormItemRule[]> = {};
  for (const field of props.schema.fields) {
    if (field.rules && Object.keys(field.rules).length > 0) {
      rules[field.key] = convertRules(field);
    }
  }
  return rules;
});

/** 提交：校验通过后打印表单数据并上报父组件 */
function handleSubmit(): void {
  formRef.value
    ?.validate()
    .then(() => {
      const data = { ...formData.value };
      console.log(`[FormDialog:${props.schema.formId}] 提交表单数据:`, data);
      emit('submit', data);
    })
    .catch(() => {
      // 校验失败：el-form 已在字段下方提示，这里无需额外处理
    });
}

defineExpose({ open, close });
</script>

<style scoped>
.unsupported-type {
  color: var(--el-color-info);
}
</style>
