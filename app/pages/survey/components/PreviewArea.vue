<template>
  <div class="preview-area">
    <div class="toolbar">
      <span class="title">{{ title }}</span>
      <span class="count">共 {{ questions.length }} 题</span>
    </div>
    <el-form label-width="100px" :model="localQuestions">
      <VueDraggable
        v-model="localQuestions"
        item-key="id"
        handle=".drag-handle"
        @end="onDragEnd"
        :disabled="props.mode !== 'edit'"
      >
        <div
          v-for="item in mode === 'write' ? visibleQuestions : localQuestions"
          :key="item.id"
          class="question-item"
          :class="{
            active: props.mode === 'edit' && selectedId === item.id,
            'trial-mode': props.mode === 'write',
          }"
          @click="selectQuestion(item.id)"
        >
          <div v-show="props.mode === 'edit'" class="drag-handle">⠿</div>
          <el-form-item :label="item.label" :required="item.required">
            <template v-if="item.type === 'input'">
              <el-input
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                :placeholder="item.placeholder"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else-if="item.type === 'textarea'">
              <el-input
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                type="textarea"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else-if="item.type === 'number'">
              <el-input-number
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else-if="item.type === 'radio'">
              <el-radio-group
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                :disabled="props.mode === 'edit'"
              >
                <el-radio
                  v-for="opt in item.options"
                  :key="opt"
                  :label="opt"
                  :value="opt"
                >
                </el-radio>
              </el-radio-group>
            </template>
            <template v-else-if="item.type === 'checkbox'">
              <el-checkbox-group
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                :disabled="props.mode === 'edit'"
              >
                <el-checkbox
                  v-for="opt in item.options"
                  :key="opt"
                  :label="opt"
                  :value="opt"
                >
                </el-checkbox>
              </el-checkbox-group>
            </template>
            <template v-else-if="item.type === 'select'">
              <el-select
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                :placeholder="item.placeholder"
                :disabled="props.mode === 'edit'"
              >
                <el-option
                  v-for="opt in item.options"
                  :key="opt"
                  :label="opt"
                  :value="opt"
                />
              </el-select>
            </template>
            <template v-else-if="item.type === 'rate'">
              <el-rate
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else-if="item.type === 'date'">
              <el-date-picker
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                type="date"
                :placeholder="item.placeholder"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else-if="item.type === 'datetime'">
              <el-date-picker
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                type="datetime"
                :placeholder="item.placeholder"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else-if="item.type === 'time'">
              <el-time-picker
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                :placeholder="item.placeholder"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else-if="item.type === 'switch'">
              <el-switch
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else-if="item.type === 'slider'">
              <el-slider
                :model-value="getFieldValue(item)"
                @update:model-value="setFieldValue(item, $event)"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else-if="item.type === 'upload'">
              <el-upload action="#" :disabled="props.mode === 'edit'">
                <el-button :disabled="props.mode === 'edit'"
                  >点击上传</el-button
                >
              </el-upload>
            </template>
            <template v-else-if="item.type === 'cascader'">
              <el-cascader
                :options="[]"
                :placeholder="item.placeholder"
                :disabled="props.mode === 'edit'"
              />
            </template>
            <template v-else>
              <span style="color: #999">不支持的类型</span>
            </template>
          </el-form-item>
          <el-button
            v-show="props.mode === 'edit'"
            class="delete-btn"
            type="danger"
            size="small"
            circle
            @click.stop="removeQuestion(item.id)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </VueDraggable>
      <div v-if="!questions.length" class="empty-tip">
        <el-empty
          :description="
            props.mode === 'edit' ? '点击左侧组件添加问题' : '暂无题目'
          "
        />
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { Delete } from "@element-plus/icons-vue";
import type { Question } from "~~/types/survey";

const props = defineProps<{
  title: string;
  questions: Question[];
  selectedId: string;
  mode?: "edit" | "write";
}>();

const emit = defineEmits<{
  (e: "update:questions", value: Question[]): void;
  (e: "select", id: string): void;
  (e: "remove", id: string): void;
}>();

const visibleQuestions = computed(() => {
  if (props.mode !== "write") {
    return localQuestions.value;
  }
  return localQuestions.value.filter((question) => {
    if (!question.dependsOn || question.dependsOn.length === 0) {
      return true;
    }
    for (const rule of question.dependsOn) {
      const targetQuestion = localQuestions.value.find(
        (q) => q.id === rule.questionId,
      );
      if (!targetQuestion) {
        continue;
      }
      const hasValue =
        targetQuestion.value !== undefined &&
        targetQuestion.value !== null &&
        targetQuestion.value !== "";
      console.log(
        rule.hasValue,
        hasValue,
        rule.hasValue === hasValue,
        rule.visible,
      );
      // 若希望显示则 当前问题的值 必须和 依赖条件 一致
      if (rule.hasValue === hasValue) {
        return rule.visible;
      } else {
        return !rule.visible;
      }
    }
    return true;
  });
});

// 设计模式绑定 defaultValue，试答模式绑定 value
function getFieldValue(item: Question) {
  return props.mode === "edit"
    ? item.defaultValue
    : (item.value ?? item.defaultValue);
}

function setFieldValue(item: Question, val: any) {
  item.value = val;
}

// 本地副本用于拖拽
const localQuestions = ref<Question[]>([...props.questions]);

watch(
  () => props.questions,
  (newVal) => {
    localQuestions.value = [...newVal];
  },
  { deep: true },
);

// 进入试答模式时，用当前 defaultValue 重置 value
watch(
  () => props.mode === "edit",
  (newDisabled) => {
    if (!newDisabled) {
      localQuestions.value.forEach((item) => {
        item.value = Array.isArray(item.defaultValue)
          ? [...item.defaultValue]
          : item.defaultValue;
      });
    }
  },
);

/**
 * 拖拽结束时更新问题列表
 * @param event 拖拽事件
 */
function onDragEnd() {
  emit("update:questions", localQuestions.value);
}

function selectQuestion(id: string) {
  if (props.mode !== "edit") {
    return;
  }
  emit("select", id);
}

function removeQuestion(id: string) {
  emit("remove", id);
}
</script>

<style scoped lang="scss">
.preview-area {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  .toolbar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    font-size: 16px;
    font-weight: bold;

    .count {
      font-size: 14px;
      font-weight: normal;
      color: #999;
    }
  }

  .question-item {
    position: relative;
    padding: 16px 40px 16px 24px;
    margin-bottom: 12px;
    border: 2px solid #e8e8e8;
    border-radius: 8px;
    cursor: pointer;
    background: #fafbfc;

    &.active {
      border: 2px dashed #409eff;
      background: #ecf5ff;
    }

    &:hover {
      border-color: #409eff;
    }

    &.trial-mode {
      border: none;
      border-radius: 0;
      background: #fff;
    }

    &.trial-mode:hover {
      cursor: default;
    }

    .drag-handle {
      position: absolute;
      left: 4px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      color: #ccc;
      cursor: grab;
      user-select: none;
    }

    .delete-btn {
      position: absolute;
      right: 8px;
      top: 8px;
    }
  }

  .empty-tip {
    padding: 40px 0;
  }
}
</style>
