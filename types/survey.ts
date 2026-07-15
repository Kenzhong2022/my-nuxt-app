// types/survey.ts

// ============ 基础题型标识 ============
export type QuestionType =
  | "input" // 单行文本
  | "textarea" // 多行文本
  | "number" // 数字
  | "radio" // 单选
  | "checkbox" // 多选
  | "select" // 下拉选择
  | "rate" // 评分
  | "date" // 日期
  | "datetime" // 日期时间
  | "time" // 时间
  | "switch" // 开关
  | "slider" // 滑块
  | "upload" // 上传
  | "cascader"; // 级联选择

// ============ 单个问题配置 ============
export interface Question {
  id: string; // 唯一标识（nanoid）
  type: QuestionType; // 题型
  label: string; // 标题
  placeholder?: string; // 占位提示
  required: boolean; // 是否必填
  defaultValue?: any; // 默认值（设计师设置）
  value?: any; // 填写值（答题时使用）
  options?: string[]; // 选项列表（仅单选/多选/下拉使用）
  props?: Record<string, any>; // 透传给组件的额外属性（如 maxLength, rows）
  sort: number; // 排序序号（用于拖拽）
  // 其他扩展字段（如校验规则）可额外添加
  dependsOn?: DependencyRule[];
}

export interface DependencyRule {
  questionId: string;
  /** 依赖条件 已回答/未回答 */
  condition?: "answered" | "unanswered";
  action?: "show" | "hide";

  hasValue?: boolean;
  visible?: boolean;
}

export type SurveyType = Survey;

// ============ 问卷整体结构 ============
export interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  status: "draft" | "published" | "closed";
  created_at?: string;
  updated_at?: string;
}

// ============ 侧边栏组件元数据 ============
export interface ComponentMeta {
  type: QuestionType;
  label: string; // 显示名称（中文）
  icon: string; // Element Plus 图标名称（字符串）
  defaultConfig: Partial<Question>; // 添加时的默认配置
}
