<template>
  <div>
    <DynamicForm v-if="formSchema" :schema="formSchema" />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const formSchema = ref(null);

onMounted(async function () {
  formSchema.value = {
    formId: "user_profile_form",
    title: "个人信息登记",
    fields: [
      {
        key: "name",
        type: "input",
        label: "姓名",
        placeholder: "请输入姓名",
        defaultValue: "",
        rules: {
          required: true,
          pattern: "^[\\u4e00-\\u9fa5]{2,4}$",
          message: "请输入2-4位中文",
          trigger: "blur", // 失去焦点时触发校验
        },
        props: { maxLength: 20 },
      },
      {
        key: "gender",
        type: "radio",
        label: "性别",
        defaultValue: "male",
        options: [
          { label: "男", value: "male" },
          { label: "女", value: "female" },
        ],
        rules: {
          required: true,
          message: "请选择性别",
          trigger: "change", // 值变化时立即触发校验
        },
      },
      {
        key: "city",
        type: "select",
        label: "城市",
        options: [
          { label: "北京", value: "bj" },
          { label: "上海", value: "sh" },
        ],
        // 无校验规则，不配置 rules
      },
      {
        key: "is_company",
        type: "switch",
        label: "是否为企业用户",
        defaultValue: false,
      },
      {
        key: "company_name",
        type: "input",
        label: "企业名称",
        dependsOn: {
          field: "is_company",
          value: true,
        },
        rules: {
          required: true,
          message: "企业名称不能为空",
          trigger: "blur", // 失去焦点触发
        },
      },
      {
        key: "email",
        type: "input",
        label: "邮箱",
        placeholder: "请输入邮箱",
        defaultValue: "",
        rules: {
          required: true,
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          message: "请输入有效的邮箱地址",
          trigger: "blur", // 失去焦点触发
        },
      },
      {
        key: "age",
        type: "number",
        label: "年龄",
        placeholder: "请输入年龄",
        defaultValue: 18,
        rules: {
          required: true,
          message: "年龄不能为空",
          trigger: "blur",
        },
      },
    ],
    submitText: "提交",
    resetText: "重置",
  };
});
</script>
