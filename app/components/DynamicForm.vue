<template>
  <div class="dynamic-form">
    <h2 v-if="schema?.title">{{ schema.title }}</h2>
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      :validate-on-rule-change="false"
      @submit.prevent="handleSubmit"
    >
      <!-- 遍历可见字段 -->
      <el-form-item
        v-for="field in visibleFields"
        :key="field.key"
        :label="field.label"
        :prop="field.key"
      >
        <!-- 输入框（含 number） -->
        <el-input
          v-if="field.type === 'input' || field.type === 'number'"
          v-model="formData[field.key]"
          :type="field.type === 'number' ? 'number' : 'text'"
          :placeholder="field.placeholder"
          v-bind="field.props || {}"
          clearable
        />

        <!-- 下拉选择 -->
        <el-select
          v-else-if="field.type === 'select'"
          v-model="formData[field.key]"
          :placeholder="field.placeholder || '请选择'"
          clearable
        >
          <el-option
            v-for="opt in field.options"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <!-- 单选框组 -->
        <el-radio-group
          v-else-if="field.type === 'radio'"
          v-model="formData[field.key]"
        >
          <el-radio
            v-for="opt in field.options"
            :key="String(opt.value)"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio>
        </el-radio-group>

        <!-- 开关 -->
        <el-switch
          v-else-if="field.type === 'switch'"
          v-model="formData[field.key]"
          :active-value="true"
          :inactive-value="false"
        />

        <!-- 文本域 -->
        <el-input
          v-else-if="field.type === 'textarea'"
          v-model="formData[field.key]"
          :placeholder="field.placeholder"
          type="textarea"
          v-bind="field.props || {}"
        />

        <!-- 未知类型提示 -->
        <span v-else style="color: #999">
          未支持的控件类型：{{ field.type }}
        </span>
      </el-form-item>

      <!-- 操作按钮 -->
      <el-form-item>
        <el-button type="primary" native-type="submit">
          {{ schema?.submitText || "提交" }}
        </el-button>
        <el-button @click="handleReset">
          {{ schema?.resetText || "重置" }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch, onMounted, ref } from "vue";
import type { FormSchema, FieldConfig } from "~~/types/dynamicForm";
import type { FormInstance, FormItemRule } from "element-plus";

const props = defineProps<{
  schema: FormSchema;
}>();

const formRef = ref<FormInstance>();

// 表单数据
const formData = reactive<Record<string, any>>({});

// 顶层函数：初始化默认值（使用 function 声明）
function initDefaults() {
  if (!props.schema?.fields) return;
  const defaults: Record<string, any> = {};
  props.schema.fields.forEach((f) => {
    defaults[f.key] = f.defaultValue ?? "";
  });
  Object.assign(formData, defaults);
}

onMounted(() => {
  initDefaults();
});

// 监听 schema 变化，回调使用箭头函数
watch(
  () => props.schema,
  (newSchema) => {
    initDefaults();
    formRef.value?.clearValidate();
  },
  { deep: true },
);

/**
 * 计算可见字段（联动）
 * @returns 可见字段数组
 * @description 根据字段依赖关系，动态筛选可见字段。
 */
const visibleFields = computed(() => {
  return props.schema.fields.filter((field) => {
    if (!field.dependsOn) return true;
    return formData[field.dependsOn.field] === field.dependsOn.value;
  });
});

// 顶层函数：转换校验规则
function convertRules(field: FieldConfig): FormItemRule[] {
  const rules: FormItemRule[] = [];
  const fieldRules = field.rules;
  if (!fieldRules) return rules;

  const trigger = fieldRules.trigger || "blur";

  if (fieldRules.required) {
    rules.push({
      required: true,
      message: `${field.label}不能为空`,
      trigger,
    });
  }
  if (fieldRules.pattern) {
    rules.push({
      pattern: new RegExp(fieldRules.pattern),
      message: fieldRules.message || `${field.label}格式不正确`,
      trigger,
    });
  }
  // 可扩展其他规则（如 min、max、validator）
  return rules;
}

// 动态生成 rules
const formRules = computed(() => {
  const rules: Record<string, FormItemRule[]> = {};
  visibleFields.value.forEach((field) => {
    if (field.rules && Object.keys(field.rules).length > 0) {
      rules[field.key] = convertRules(field);
    }
  });
  return rules;
});

// 顶层函数：提交处理
function handleSubmit() {
  if (!formRef.value) return;
  formRef.value.validate((valid) => {
    if (valid) {
      console.log("提交数据：", formData);
      // 调用后端 API
      // emit('submit', formData)
    } else {
      console.log("校验失败");
    }
  });
}

// 顶层函数：重置处理
function handleReset() {
  const defaults: Record<string, any> = {};
  props.schema.fields.forEach((f) => {
    defaults[f.key] = f.defaultValue ?? "";
  });
  Object.assign(formData, defaults);
  formRef.value?.clearValidate(); // 清除所有校验状态
}
</script>

<style scoped>
.dynamic-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
:deep(.el-form-item) {
  margin-bottom: 18px;
}
</style>
