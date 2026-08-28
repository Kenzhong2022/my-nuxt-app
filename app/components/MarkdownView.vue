<!-- 通用 Markdown 渲染组件：marked 解析 + DOMPurify 消毒 + 统一排版样式 -->
<template>
  <div class="markdown-view" v-html="html"></div>
</template>

<script setup lang="ts">
import { marked } from "marked";
import DOMPurify from "dompurify";

const props = defineProps<{
  /** Markdown 源文本，必传（空串渲染为空） */
  content: string;
}>();

marked.setOptions({
  breaks: true,
  gfm: true,
});

const html = computed(() => {
  const text = props.content;
  if (!text) {
    return "";
  }
  return DOMPurify.sanitize(String(marked.parse(text, { async: false })));
});
</script>

<style scoped lang="scss">
.markdown-view {
  font-size: var(--kk-font-size-base);
  color: var(--el-text-color-regular);
  line-height: var(--kk-line-height-large);
  word-break: break-word;

  :deep(h1),
  :deep(h2) {
    font-size: var(--kk-font-size-large);
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 1.5rem 0 0.75rem;
  }

  :deep(h3),
  :deep(h4) {
    font-size: var(--kk-font-size-medium);
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 1.25rem 0 0.5rem;
  }

  :deep(p) {
    margin: 0.5rem 0;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 1.5rem;
  }

  :deep(li) {
    margin: 0.25rem 0;
  }

  :deep(a) {
    color: var(--el-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 0.5rem;
  }

  :deep(code) {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    background: var(--el-fill-color-light);
    color: var(--el-color-danger);
    font-family: monospace;
  }

  :deep(pre) {
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: var(--el-fill-color-light);
    overflow-x: auto;

    code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
  }

  :deep(blockquote) {
    margin: 0.5rem 0;
    padding-left: 0.75rem;
    border-left: 3px solid var(--el-border-color-light);
    color: var(--el-text-color-secondary);
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;

    th,
    td {
      border: 1px solid var(--el-border-color-light);
      padding: 0.375rem 0.625rem;
    }

    th {
      background: var(--el-fill-color-light);
      font-weight: 600;
    }
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid var(--el-border-color-lighter);
    margin: 1rem 0;
  }
}
</style>
