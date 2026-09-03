<template>
  <div ref="wrapRef" class="welcome-wrap">
    <div class="header-tag">CHAT A.I+</div>
    <h1 class="welcome-title">你好！今天我能帮你做些什么？</h1>

    <!-- 第一列：功能块；第二、三列：提示卡循环平铺 -->
    <div class="content-row">
      <div class="content-col" v-for="group in featureGroups" :key="group.key">
        <ChatFeatureBlock :key="group.key" :icon="group.icon" :title="group.title" :desc="group.desc" />
        <div class="prompt-col">
          <ChatPromptCard class="prompt-card" v-for="p in group.prompts" :key="p.key" :title="p.title" :desc="p.desc" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatFeatureBlock from './ChatFeatureBlock.vue';
import ChatPromptCard from './ChatPromptCard.vue';
import type { Component } from 'vue';
import { IconExplore, IconCapability, IconLimitation } from '~/assets/svg';

/** 提示卡 */
interface PromptItem {
  key: string;
  title: string;
  desc: string;
}

/** 功能分组（树形）：左侧功能块 + 挂载的提示卡 */
interface FeatureGroup {
  key: string;
  icon: Component | undefined;
  title: string;
  desc: string;
  prompts: PromptItem[];
}

const featureGroups: FeatureGroup[] = [
  {
    key: 'explore',
    icon: IconExplore,
    title: '探索',
    desc: '了解如何使用 CHAT A.I+ 平台满足你的需求',
    prompts: [
      { key: 'prompt-explain', title: '"解释"', desc: '用通俗易懂的方式解释量子计算' },
      { key: 'prompt-how', title: '"怎么做"', desc: '打造一个类似谷歌的搜索引擎平台' },
    ],
  },
  {
    key: 'capability',
    icon: IconCapability,
    title: '能力',
    desc: 'CHAT A.I+ 能在多大程度上满足你的需求',
    prompts: [
      { key: 'prompt-remember', title: '"记住"', desc: '记住：用通俗的语言解释量子计算' },
      { key: 'prompt-allow', title: '"允许"', desc: '允许用户对回答进行后续修正' },
    ],
  },
  {
    key: 'limitation',
    icon: IconLimitation,
    title: '局限',
    desc: '了解 CHAT A.I+ 的能力边界与已知限制',
    prompts: [
      { key: 'prompt-maybe', title: '"可能"', desc: '偶尔可能生成不正确的信息' },
      { key: 'prompt-limited', title: '"受限"', desc: '对 2021 年后的世界和事件了解有限' },
    ],
  },
];

/** 全部提示卡（平铺） */
const allPrompts = computed(() => featureGroups.flatMap((g) => g.prompts));

// ===================== 宽度监听（调试用，打印到控制台） =====================
const wrapRef = ref<HTMLElement | null>(null);
let observer: ResizeObserver | undefined;

onMounted(() => {
  observer = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width;
    if (width !== undefined) console.log('[ChatAiWelcome] 容器宽度:', width);
  });
  if (wrapRef.value) observer.observe(wrapRef.value);
});
onUnmounted(() => observer?.disconnect());
</script>

<style scoped lang="scss">
.welcome-wrap {
  text-align: center;

  .header-tag {
    display: inline-block;
    border: 1px solid var(--el-border-color);
    padding: 0.5rem 1.25rem;
    border-radius: 6.25rem;
    font-size: var(--kk-font-size-large);
  }
  .welcome-title {
    font-size: var(--kk-font-size-extra-extra-large);
    margin: 1rem 0 2.5rem;
  }

  // 第一列功能块 + 右侧提示卡网格（行距与卡片网格一致，保证水平对齐）
  .content-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    .content-col {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      gap: 0.875rem;
      .prompt-col {
        display: flex;
        flex-direction: row;
        gap: 0.875rem;
        .prompt-card {
          flex: 1;
        }
      }
    }
  }

  .feature-col {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;

    // 均分高度，与右侧卡片行对齐
    > * {
      flex: 1;
    }
  }

  // ===================== 手机端适配（≤768px） =====================
  @media (max-width: 768px) {
    .welcome-title {
      font-size: var(--kk-font-size-extra-large);
      margin: 1rem 0 1.5rem;
    }

    // 单列纵排，提示卡跟随各功能块换行堆叠
    .content-row {
      .content-col {
        flex-direction: column;

        .prompt-col {
          flex-direction: column;
        }
      }
    }
  }
}
</style>
