<template>
  <div class="project-menu-col flex flex-col gap-4 justify-center">
    <div
      v-for="card in cardList"
      :key="card.id"
      class="project-card cursor-pointer"
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
</template>

<script setup lang="ts">
interface CardConfig {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  action: () => void;
}
const props = defineProps({
  cardList: {
    type: Array as PropType<CardConfig[]>,
    default: () => [],
  },
});
</script>

<style scoped lang="scss">
.project-menu-col {
  .project-card {
    width: 100%;
    .inner {
    }
  }
}
</style>
