<script setup lang="ts">
// 临时 AI 对话页：单次对话（无历史记忆），调用 POST /api/ai/chat（Cloudflare Workers AI 流式）
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const input = ref('')
const output = ref('')
const loading = ref(false)

async function send() {
  const text = input.value.trim()
  if (!text || loading.value) return

  loading.value = true
  output.value = ''
  input.value = ''

  // 单次对话：每次只带 system + 本次输入，不带历史
  const messages: Message[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: text },
  ]

  try {
    // 流式必须用原生 fetch（$fetch/useFetch 会等整个响应结束）
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} ${detail.slice(0, 120)}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      // SSE 按行切分，最后一段可能不完整，留到下一轮
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const json = JSON.parse(line.slice(6))
          if (json.response) output.value += json.response
        } catch {
          // 忽略无法解析的残缺行
        }
      }
    }
  } catch (err) {
    output.value += `\n[请求失败: ${err instanceof Error ? err.message : err}]`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="chat-page">
    <div class="chat-card">
      <h2>AI 对话（临时·单次）</h2>

      <div class="output" :class="{ placeholder: !output && !loading }">
        <template v-if="output">{{ output }}</template>
        <template v-else-if="loading">生成中…</template>
        <template v-else>输入问题开始对话（每次提问独立，不保留上下文）</template>
      </div>

      <form class="input-row" @submit.prevent="send">
        <el-input
          v-model="input"
          :disabled="loading"
          placeholder="问点什么…"
          size="large"
          clearable
        />
        <el-button
          type="primary"
          size="large"
          native-type="submit"
          :loading="loading"
          :disabled="!input.trim()"
        >
          发送
        </el-button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  justify-content: center;
  padding: 40px 16px;
}
.chat-card {
  width: 100%;
  max-width: 720px;
}
.output {
  min-height: 240px;
  padding: 16px;
  margin: 12px 0;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  line-height: 1.7;
}
.output.placeholder {
  color: var(--el-text-color-placeholder);
}
.input-row {
  display: flex;
  gap: 12px;
}
</style>
