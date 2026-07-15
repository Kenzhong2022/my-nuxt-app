<!-- 项目首页，通过卡片形式前往各个功能模块：商城，问卷，后台管理 -->
<template>
  <div class="index-container">
    <div class="main px-4 py-8">
      <div class="info mb-12">
        <div class="card-title font-bold flex items-center gap-[1px]">
          <div
            v-for="(char, i) in '欢迎来到我的项目首页'"
            :key="i"
            class="card-title-char"
          >
            {{ char }}
          </div>
        </div>
        <div class="card-desc project-desc flex items-center">
          <div
            v-for="(
              char, i
            ) in '这是一个基于 Nuxt.js 的项目，用于展示商城、问卷和后台管理功能。'"
            :key="i"
            class="project-desc-char"
          >
            {{ char }}
          </div>
        </div>
      </div>
      <div class="project-container">
        <div
          v-for="card in cardList"
          :key="card.id"
          class="project-card"
          :ref="(el) => setCardRef(el as HTMLElement, card.id)"
        >
          <div class="inner">
            <div class="card-title">{{ card.title }}</div>
            <div class="card-desc">{{ card.description }}</div>
            <div class="card-footer" @click="handleCardClick(card)">
              <div>{{ card.buttonText }}</div>
              <el-icon><ArrowRightBold /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from "gsap";
definePageMeta({
  title: "首页",
  layout: "default",
});

interface CardConfig {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  action: () => void;
}

const cardRefs = new Map<string, HTMLElement>();

function setCardRef(el: HTMLElement, id: string) {
  cardRefs.set(id, el);
}

const cardList: CardConfig[] = [
  {
    id: "shop",
    title: "商城",
    description: "这是一个商城模块，用于展示商品信息、购物车功能和订单管理。",
    buttonText: "去逛逛",
    action: () => navigateTo("/store"),
  },
  {
    id: "survey",
    title: "问卷",
    description: "前往问卷模块",
    buttonText: "进入问卷",
    action: () => navigateTo("/survey"),
  },
  {
    id: "admin",
    title: "后台管理",
    description: "前往后台管理模块",
    buttonText: "进入后台",
    action: () => navigateTo("/admin"),
  },
  {
    id: "agent",
    title: "agent 模块",
    description: "前往 agent 模块",
    buttonText: "进入Agent",
    action: () => navigateTo("/agent"),
  },
];

function handleCardClick(card: CardConfig) {
  card.action();
}

function animationCardTitle() {
  const tl = gsap.timeline();
  tl.from(".card-title-char", {
    opacity: 0,
    y: 55,
    stagger: 0.08,
    duration: 0.5,
    ease: "back.out",
    delay: 1,
  });
  tl.from(".project-desc-char", {
    opacity: 0,
    stagger: 0.05,
    duration: 0.08,
    ease: "none",
  });
}

// 监听鼠标移动事件，更新卡片位置
onMounted(() => {
  document.addEventListener("mousemove", (e) => {
    // 遍历所有卡片，更新其位置
    cardRefs.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--x", `${x}px`);
      card.style.setProperty("--y", `${y}px`);
    });
  });
  animationCardTitle();
});

onUnmounted(() => {
  document.removeEventListener("mousemove", (e) => {
    document.documentElement.style.setProperty("--x", `${e.clientX}px`);
    document.documentElement.style.setProperty("--y", `${e.clientY}px`);
  });
});
</script>

<style scoped lang="scss">
.card-title-char {
  font-size: 3rem;
  /* 错位阴影模拟3D厚度 + 蓝紫外发光 */
  text-shadow:
    1px 1px 2px #7c3aed,
    2px 2px 4px #6366f1,
    3px 3px 6px #4f46e5,
    /* 蓝紫渐变发光层 */ 0 0 6px #3b82f6,
    0 0 14px #8b5cf6,
    0 0 24px #a855f7;
}

.index-container {
  min-height: 100vh;
}

.main {
  max-width: 1024px;
  margin: 0 auto;
}

.info {
  color: #fff;
  margin: 20px 0 50px;
}

.card-title {
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 2;
}

.project-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  overflow: hidden;
}

.project-card {
  position: relative;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  height: 300px;
  overflow: hidden;

  .inner {
    position: absolute;
    z-index: 3;
    display: flex;
    flex-direction: column;
    padding: 20px;
    border-radius: inherit;
    background: #222;
    inset: 5px;
    color: #fff;
  }

  &::before {
    content: "";
    position: absolute;
    top: var(--y, -1000px);
    left: var(--x, -1000px);
    width: 100%;
    height: 100%;
    background: radial-gradient(
      closest-side circle,
      rgba(255, 255, 255, 0.6) 0%,
      transparent 100%
    );
    z-index: 2;
    border-radius: inherit;
    transform: translate(-50%, -50%);
  }
}

.card-footer {
  margin-top: auto;
  padding-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  position: relative;
  transition: color 0.3s ease-in-out;
  // 底部下划线伪元素
  &::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -6px;
    width: 0;
    height: 1px;
    background-color: #fff;
    transition: width 0.3s ease-in; // 下划线宽度过渡
  }

  &:hover {
    color: #fff;
    cursor: pointer;
    &::after {
      width: 100%;
    }
  }
}

.card-desc {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
}
</style>
