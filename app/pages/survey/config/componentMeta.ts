// config/componentMeta.ts
import type { ComponentMeta } from "~~/types/survey";

export const componentMetaList: ComponentMeta[] = [
  {
    type: "input",
    label: "单行文本",
    icon: "Edit",
    defaultConfig: {
      placeholder: "请输入内容",
      required: false,
      defaultValue: "",
      props: { maxLength: 100 },
    },
  },
  {
    type: "textarea",
    label: "多行文本",
    icon: "Edit",
    defaultConfig: {
      placeholder: "请输入内容",
      required: false,
      defaultValue: "",
      props: { rows: 4 },
    },
  },
  {
    type: "number",
    label: "数字输入",
    icon: "Tickets",
    defaultConfig: {
      placeholder: "请输入数字",
      required: false,
      defaultValue: 0,
    },
  },
  {
    type: "radio",
    label: "单选题",
    icon: "CircleCheck",
    defaultConfig: {
      options: ["选项A", "选项B"],
      required: false,
      defaultValue: "",
    },
  },
  {
    type: "checkbox",
    label: "多选题",
    icon: "Select",
    defaultConfig: {
      options: ["选项A", "选项B"],
      required: false,
      defaultValue: [],
    },
  },
  {
    type: "select",
    label: "下拉选择",
    icon: "CaretBottom",
    defaultConfig: {
      options: ["选项A", "选项B"],
      required: false,
      defaultValue: "",
    },
  },
  {
    type: "rate",
    label: "评分",
    icon: "Star",
    defaultConfig: {
      required: false,
      defaultValue: 5,
      props: { max: 5 },
    },
  },
  {
    type: "date",
    label: "日期",
    icon: "Calendar",
    defaultConfig: {
      required: false,
      defaultValue: null,
    },
  },
  {
    type: "datetime",
    label: "日期时间",
    icon: "Calendar",
    defaultConfig: {
      required: false,
      defaultValue: null,
    },
  },
  {
    type: "time",
    label: "时间",
    icon: "Clock",
    defaultConfig: {
      required: false,
      defaultValue: null,
    },
  },
  {
    type: "switch",
    label: "开关",
    icon: "Refresh",
    defaultConfig: {
      required: false,
      defaultValue: false,
    },
  },
  {
    type: "slider",
    label: "滑块",
    icon: "Operation",
    defaultConfig: {
      required: false,
      defaultValue: 0,
      props: { min: 0, max: 100 },
    },
  },
  {
    type: "upload",
    label: "文件上传",
    icon: "Upload",
    defaultConfig: {
      required: false,
      defaultValue: null,
    },
  },
  {
    type: "cascader",
    label: "级联选择",
    icon: "More",
    defaultConfig: {
      required: false,
      options: ["选项A", "选项B"],
      defaultValue: [],
    },
  },
];
