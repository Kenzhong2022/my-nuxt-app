<template>
  <div class="p-8 space-y-6">
    <h1 class="text-2xl font-bold">插件版主题色测试</h1>

    <!-- 颜色切换 -->
    <div class="space-x-2">
      <el-button type="danger" @click="setColor('#f56c6c')">红</el-button>
      <el-button type="primary" @click="setColor('#409eff')">蓝</el-button>
      <el-button type="success" @click="setColor('#67c23a')">绿</el-button>
      <el-button type="warning" @click="setColor('#e6a23c')">黄</el-button>
      <el-button @click="setColor('#ff6b6b')">珊瑚红</el-button>
    </div>

    <!-- 当前颜色 -->
    <p class="text-sm text-gray-500">当前主题色：{{ primaryColor }}</p>

    <!-- Dark 切换 -->
    <el-switch v-model="isDark" active-text="Dark" inactive-text="Light" />

    <el-divider />

    <!-- 组件展示 -->
    <div class="space-x-2">
      <el-button type="primary">主按钮</el-button>
      <el-button type="primary" plain>朴素按钮</el-button>
      <el-button type="primary" text>文字按钮</el-button>
    </div>

    <div class="space-x-2">
      <el-tag type="primary">Primary Tag</el-tag>
      <el-tag type="success">Success</el-tag>
      <el-tag type="warning">Warning</el-tag>
      <el-tag type="danger">Danger</el-tag>
    </div>

    <div class="w-64">
      <el-input v-model="input" placeholder="输入框">
        <template #append>
          <el-button type="primary">搜索</el-button>
        </template>
      </el-input>
    </div>

    <el-progress :percentage="50" />
    <el-pagination background layout="prev, pager, next" :total="100" />
  </div>
</template>

<script setup lang="ts">
import { useDark } from "@vueuse/core";

const input = ref("");

// 和插件共用同一个 useState key，响应式打通
const primaryColor = useState<string>("el-primary-color");

// 切换主题色（插件里的 computed 会响应这个状态，自动更新 <style>）
function setColor(color: string) {
  primaryColor.value = color;
}

// Dark/Light 切换（和插件完全解耦）
const isDark = useDark({
  storageKey: "color-scheme", // 独立的 key，不要和主题色 cookie 冲突
  selector: "html",
  attribute: "class",
  valueDark: "dark",
  valueLight: "",
});
</script>
