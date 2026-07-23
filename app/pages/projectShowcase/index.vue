<!-- 项目首页，通过卡片形式前往各个功能模块：商城，问卷，后台管理 -->
<template>
  <div class="index-container">
    <div class="main px-4 py-8">
      <div class="info mb-12">
        <div class="card-title font-bold flex flex-wrap items-center gap-[1px]">
          <div
            v-for="(char, i) in '欢迎来到我的项目首页'"
            :key="i"
            class="card-title-char"
          >
            {{ char }}
          </div>
        </div>
        <div class="card-desc project-desc flex flex-wrap items-center">
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
          @click="handleCardClick(card)"
          class="project-card cursor-pointer"
          :ref="(el) => setCardRef(el as HTMLElement, card.id)"
        >
          <div class="inner">
            <div class="card-title">{{ card.title }}</div>
            <div class="card-desc">{{ card.description }}</div>
            <div class="card-footer">
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
import { useLoadingStore } from "@/stores/loading";
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
    title: "商城系统",
    description: "这是一个商城模块，用于展示商品信息、购物车功能和订单管理。",
    buttonText: "去逛逛",
    action: () => navigateTo("/store"),
  },
  {
    id: "survey",
    title: "问卷工坊",
    description:
      "支持拖拽可视化搭建、动态表单配置、题目联动依赖，可实时试答、一键发布分享问卷。",
    buttonText: "进入问卷",
    action: () => navigateTo("/survey"),
  },
  {
    id: "admin",
    title: "后台管理系统",
    description: "前往后台管理模块",
    buttonText: "进入后台",
    action: () => navigateTo("/admin"),
  },
  {
    id: "agent",
    title: "Chief Agent",
    description:
      "Python后端构建LangChain智能体，调用千问视觉识别食材，联网搜索食谱，流式输出可暂停的Markdown结果。",
    buttonText: "进入Agent",
    action: () => navigateTo("/agent"),
  },
];

const loadingStore = useLoadingStore();

function handleCardClick(card: CardConfig) {
  loadingStore.setLoading(true);
  setTimeout(() => {
    card.action();
    loadingStore.setLoading(false);
  }, 3000);
}

/**
 * 卡片标题动画
 */
function animationCardTitle(): void {
  if (!tl) {
    return;
  }
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
// 提取事件处理函数，便于添加和移除
function handleMouseMove(e: MouseEvent) {
  cardRefs.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);
  });
}

const { isDesktop } = useDevice(); // 监听鼠标移动事件，更新卡片位置
/**注册GSAP时间线 */
let tl: ReturnType<typeof gsap.timeline> | null = gsap.timeline();

onMounted(() => {
  console.log("projectShowcase组件挂载时");

  animationCardTitle();

  if (isDesktop.value) {
    document.addEventListener("mousemove", handleMouseMove);
  }
});

onActivated(() => {
  console.log("组件激活时，播放GSAP时间线");
  tl?.play();
});

onDeactivated(() => {
  console.log("组件停用时，暂停GSAP时间线");
  tl?.pause();
});

onUnmounted(() => {
  console.log("projectShowcase组件卸载时");
  // 清理GSAP时间线
  tl?.kill();
  tl = null;
  document.removeEventListener("mousemove", handleMouseMove);
});
</script>

<style scoped lang="scss">
// ===================== 顶层容器 =====================
.index-container {
  min-height: 100vh;
}

.main {
  max-width: 1024px;
  margin: 0 auto;
}

.info {
  color: var(--el-text-color-secondary);
  margin: 20px 0 50px;
}

// ===================== 标题文字动画字符 =====================
.card-title-char {
  font-size: 3rem;
  color: var(--el-text-color-primary);
}

.project-desc-char {
  font-size: 1rem;
  color: var(--el-text-color-secondary);
}

// ===================== 卡片布局容器 =====================
.project-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  overflow: hidden;
  margin-bottom: 50px;
}

// ===================== 卡片主体 =====================
.project-card {
  --card-radius: 20px; // 统一抽取圆角变量，方便修改
  --card-inset: 3px;
  position: relative;
  border-radius: var(--card-radius);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  height: 300px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.6);

  // 内层底色容器
  .inner {
    position: absolute;
    z-index: 3;
    inset: var(--card-inset);
    display: flex;
    flex-direction: column;
    padding: 20px;
    border-radius: calc(var(--card-radius) - var(--card-inset));
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
  }

  // 鼠标跟随径向渐变光效
  &::before {
    content: "";
    position: absolute;
    z-index: 2;
    top: var(--y, -1000px);
    left: var(--x, -1000px);
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(
      closest-side circle,
      var(--el-border-color-darker) 0%,
      transparent 100%
    );
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  // 卡片标题
  .card-title {
    font-size: 1.5rem;
    font-weight: bold;
    line-height: 2;
  }

  // 卡片描述文本
  .card-desc {
    font-size: 1rem;
    color: var(--el-text-color-secondary);
    margin-bottom: auto;
  }

  // 底部跳转按钮区域
  .card-footer {
    margin-top: auto;
    padding-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    color: var(--el-text-color-secondary);
    transition: color 0.3s ease-in-out;

    // 底部下滑线
    &::after {
      content: "";
      position: absolute;
      left: 0;
      bottom: -6px;
      width: 0;
      height: 1px;
      background-color: var(--el-text-color-primary);
      transition: width 0.3s ease-in;
    }

    &:hover {
      color: var(--el-color-primary);

      &::after {
        width: 100%;
      }
    }
  }
}

@media (max-width: 768px) {
  .main {
    padding: 0.5rem 1rem; // 缩小左右边距，充分利用屏幕
  }

  .info {
    margin: 12px 0 30px; // 减少间距
  }

  .card-title-char {
    font-size: 2rem; // 标题缩小
  }

  .project-desc-char {
    font-size: 0.875rem; // 描述文字缩小
  }

  .project-container {
    grid-template-columns: 1fr; // 改为单列
    gap: 16px;
  }

  .project-card {
    height: 220px; // 卡片高度降低，更适合手机竖屏

    .inner {
      padding: 16px;
    }

    .card-title {
      font-size: 1.25rem;
      line-height: 1.6;
    }

    .card-desc {
      font-size: 0.875rem;
    }

    .card-footer {
      font-size: 0.875rem;
      padding-top: 8px;
    }
  }
}
</style>
