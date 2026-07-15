// types.ts
export interface FieldOption {
  label: string;
  value: string | number | boolean;
}

export interface FieldRule {
  required?: boolean;
  pattern?: string;
  message?: string;
  trigger?: string | string[]; // ✅ 修正类型
  min?: number;
  max?: number;
  len?: number;
  // validator 无法从后端直接传递函数，可留空或通过字符串映射
  validator?: string; // 例如 'validateEmail'，前端根据字符串查找对应函数
  // 允许额外自定义规则
  [key: string]: any;
}

export interface FieldConfig {
  key: string;
  type: "input" | "select" | "radio" | "textarea" | "switch" | "number";
  label: string;
  placeholder?: string;
  defaultValue?: any;
  options?: FieldOption[];
  rules?: FieldRule;
  props?: Record<string, any>;
  dependsOn?: { field: string; value: any };
}

export interface FormSchema {
  formId: string;
  title?: string;
  fields: FieldConfig[];
  submitText?: string;
  resetText?: string;
}
