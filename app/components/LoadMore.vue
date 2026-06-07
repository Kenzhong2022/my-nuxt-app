<template>
  <!-- 哨兵元素 - 与视口交叉时触发加载 -->
  <div ref="sentinel" class="py-8 text-center min-h-[60px]">
    <!-- 加载中状态 -->
    <div v-if="loading" class="flex justify-center items-center gap-2">
      <el-icon class="is-loading text-xl"><Loading /></el-icon>
      <span class="text-gray-500">加载中...</span>
    </div>

    <!-- 全部加载完成状态 -->
    <div v-else-if="!hasMore" class="text-gray-400 text-sm">已加载全部商品</div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";

// 组件 Props 接口定义
interface Props {
  loading: boolean; // 是否正在加载
  hasMore: boolean; // 是否还有更多数据
}

// 定义 Props
const props = defineProps<Props>();

// 定义事件 - 加载更多
const emit = defineEmits<{
  loadMore: [];
}>();

// 哨兵元素 ref
const sentinel = ref<HTMLElement | null>(null);

// IntersectionObserver 实例
let observer: IntersectionObserver | null = null;

/**
 * 初始化 Intersection Observer
 */
function initObserver() {
  // 如果已有 observer，先断开
  if (observer) {
    observer.disconnect();
  }

  // 创建新的 Observer
  observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      // 当哨兵进入视口时
      if (entry && entry.isIntersecting) {
        // 只有非加载中且有更多数据时才触发
        if (!props.loading && props.hasMore) {
          emit("loadMore");
        }
      }
    },
    {
      rootMargin: "0px", // 提前 0px 触发加载
      threshold: 1, // 元素完全视口可见时才触发
    },
  );

  // 开始观察哨兵元素
  if (sentinel.value) {
    observer.observe(sentinel.value);
  }
}

// 组件挂载后初始化
onMounted(() => {
  // 使用 nextTick 确保 DOM 完全渲染
  nextTick(() => {
    initObserver();
  });
});

// 监听 loading 和 hasMore 状态变化
watch(
  () => [props.loading, props.hasMore],
  ([loading, hasMore]) => {
    nextTick(() => {
      if (!observer || !sentinel.value) return;

      // 断开之前的观察
      observer.disconnect();

      // 只有在非加载状态且还有更多数据时才继续观察
      if (!loading && hasMore) {
        observer.observe(sentinel.value);
      }
    });
  },
);

// 组件卸载前断开 Observer，防止内存泄漏
onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>
