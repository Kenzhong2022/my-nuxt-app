<template>
  <el-button
    v-if="visible"
    :type="type"
    :size="size"
    :disabled="businessDisabled || !effectivePermission"
    @click="handleClick"
  >
    <slot />
    <span v-if="showHint && !effectivePermission" class="perm-hint"
      >（无权限）</span
    >
  </el-button>
</template>

<script setup lang="ts">
import type { PermissionId, ActionButtonConfig } from "~~/types/permission";
import { ElMessage } from "element-plus";

interface Props {
  /** 按钮权限 ID，如 action:system:user:create */
  action: PermissionId;
  /** Element Plus 按钮类型 */
  type?: ActionButtonConfig["uiType"];
  /** Element Plus 按钮尺寸 */
  size?: "large" | "default" | "small";
  /** 业务层禁用（与权限无关） */
  disabled?: boolean;
  /** 无权限时是否仍显示按钮（仅禁用） */
  showWhenNoPerm?: boolean;
  /** 是否显示"无权限"文字提示 */
  showHint?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: "default",
  disabled: false,
  showWhenNoPerm: true,
  showHint: true,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const permissionStore = usePermissionStore();

/** 是否拥有该按钮权限（含页面前置校验） */
const effectivePermission = computed(() =>
  permissionStore.hasPermission(props.action),
);

/** 业务层禁用状态 */
const businessDisabled = computed(() => props.disabled);

/** 是否显示该按钮 */
const visible = computed(() => {
  if (effectivePermission.value) return true;
  return props.showWhenNoPerm;
});

const handleClick = (event: MouseEvent): void => {
  if (!effectivePermission.value) {
    ElMessage.warning("您没有该操作的权限");
    return;
  }
  emit("click", event);
};
</script>

<style scoped>
.perm-hint {
  font-size: 12px;
  opacity: 0.7;
  margin-left: 4px;
}
</style>
