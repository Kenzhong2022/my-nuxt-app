<template>
  <div class="config-panel">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="属性配置" name="props">
        <div v-if="questionModel">
          <el-form :model="questionModel" label-width="80px">
            <el-form-item label="标题">
              <el-input
                :model-value="questionModel.label"
                @update:model-value="updateField('label', $event)"
                placeholder="请输入问题标题"
              />
            </el-form-item>
            <el-form-item label="必填">
              <el-switch
                :model-value="questionModel.required"
                @update:model-value="updateField('required', $event as boolean)"
              />
            </el-form-item>
            <el-form-item
              label="占位提示"
              v-if="
                ['input', 'textarea', 'number'].includes(questionModel.type)
              "
            >
              <el-input
                :model-value="questionModel.placeholder"
                @update:model-value="updateField('placeholder', $event)"
                :placeholder="questionModel.placeholder || ''"
              />
            </el-form-item>

            <!-- 选项配置（仅单选/多选/下拉/级联） -->
            <el-form-item
              v-if="
                ['radio', 'checkbox', 'select', 'cascader'].includes(
                  questionModel.type,
                )
              "
              label="选项"
            >
              <div
                v-for="(opt, idx) in questionModel.options"
                :key="idx"
                class="option-item"
              >
                <el-input
                  :model-value="opt"
                  @update:model-value="updateOption(idx, $event)"
                  size="small"
                  placeholder="选项文本"
                  style="flex: 1"
                />
                <el-button
                  type="danger"
                  size="small"
                  @click="removeOption(idx)"
                  :disabled="questionModel.options!.length <= 1"
                >
                  删除
                </el-button>
              </div>
              <el-button
                size="small"
                @click="addOption"
                style="margin-top: 8px"
              >
                添加选项
              </el-button>
            </el-form-item>

            <!-- 默认值配置（根据类型） -->
            <el-form-item label="默认值">
              <el-input
                v-if="
                  questionModel.type === 'input' ||
                  questionModel.type === 'textarea'
                "
                :model-value="questionModel.defaultValue"
                @update:model-value="updateField('defaultValue', $event)"
                placeholder="默认值"
              />
              <el-input-number
                v-else-if="questionModel.type === 'number'"
                :model-value="questionModel.defaultValue"
                @update:model-value="updateField('defaultValue', $event)"
              />
              <el-radio-group
                v-else-if="questionModel.type === 'radio'"
                :model-value="questionModel.defaultValue"
                @update:model-value="updateField('defaultValue', $event)"
                fill="#409eff"
              >
                <el-radio
                  v-for="opt in questionModel.options"
                  :key="opt"
                  :label="opt"
                />
              </el-radio-group>
              <el-checkbox-group
                v-else-if="questionModel.type === 'checkbox'"
                :model-value="questionModel.defaultValue"
                @update:model-value="updateField('defaultValue', $event)"
              >
                <el-checkbox
                  v-for="opt in questionModel.options"
                  :key="opt"
                  :label="opt"
                />
              </el-checkbox-group>
              <el-select
                v-else-if="questionModel.type === 'select'"
                :model-value="questionModel.defaultValue"
                @update:model-value="updateField('defaultValue', $event)"
                placeholder="默认值"
              >
                <el-option
                  v-for="opt in questionModel.options"
                  :key="opt"
                  :label="opt"
                  :value="opt"
                />
              </el-select>
              <el-switch
                v-else-if="questionModel.type === 'switch'"
                :model-value="questionModel.defaultValue"
                @update:model-value="updateField('defaultValue', $event)"
              />
              <span v-else style="color: var(--el-text-color-secondary)"
                >暂不支持默认值配置</span
              >
            </el-form-item>

            <!-- 其他特殊属性 -->
            <el-form-item
              label="最大长度"
              v-if="questionModel.type === 'input'"
            >
              <el-input-number
                :model-value="questionModel.props?.maxLength"
                @update:model-value="
                  updateField('props', {
                    ...questionModel.props,
                    maxLength: $event,
                  })
                "
                :min="0"
                :max="1000"
              />
            </el-form-item>
            <el-form-item label="行数" v-if="questionModel.type === 'textarea'">
              <el-input-number
                :model-value="questionModel.props?.rows"
                @update:model-value="
                  updateField('props', { ...questionModel.props, rows: $event })
                "
                :min="1"
                :max="20"
              />
            </el-form-item>
            <!-- 可继续扩展其他属性 -->
          </el-form>
        </div>
        <div v-else class="empty-tip">
          <el-empty description="请选择一个问题进行配置" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="逻辑配置" name="logic">
        <div v-if="questionModel">
          <div class="dependency-section">
            <h4>显示/隐藏条件</h4>
            <div
              v-for="(rule, idx) in questionModel.dependsOn || []"
              :key="idx"
              class="dependency-rule"
            >
              <el-form :model="rule" label-width="80px">
                <el-form-item label="关联题目">
                  <el-select
                    :model-value="rule.questionId"
                    @update:model-value="
                      updateDependencyRule(idx, 'questionId', $event)
                    "
                    placeholder="选择题目"
                  >
                    <el-option
                      v-for="q in availableQuestions"
                      :key="q.id"
                      :label="q.label"
                      :value="q.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="触发条件">
                  <el-radio-group
                    :model-value="rule.hasValue"
                    @update:model-value="
                      updateDependencyRule(
                        idx,
                        'hasValue',
                        $event as DependencyRule['hasValue'],
                      )
                    "
                  >
                    <el-radio-button :value="true">已答</el-radio-button>
                    <el-radio-button :value="false">未答</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="执行动作">
                  <el-radio-group
                    :model-value="rule.visible"
                    @update:model-value="
                      updateDependencyRule(
                        idx,
                        'visible',
                        $event as DependencyRule['visible'],
                      )
                    "
                  >
                    <el-radio-button :value="true">显示</el-radio-button>
                    <el-radio-button :value="false">隐藏</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-form>
              <el-button
                type="danger"
                size="small"
                @click="removeDependencyRule(idx)"
              >
                删除规则
              </el-button>
            </div>
            <el-button size="small" @click="addDependencyRule"
              >添加规则</el-button
            >
          </div>
        </div>
        <div v-else class="empty-tip">
          <el-empty description="请选择一个问题进行配置" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Question, DependencyRule } from "~~/types/survey";

const props = defineProps<{
  questions: Question[];
}>();

const questionModel = defineModel<Question | null>("question", {
  default: null,
});

const activeTab = ref("props");

const availableQuestions = computed(() => {
  if (!questionModel.value) return [];
  return props.questions.filter((q) => q.id !== questionModel.value!.id);
});

function updateField<K extends keyof Question>(field: K, value: Question[K]) {
  if (questionModel.value) {
    const next = { ...questionModel.value };
    (next as any)[field] = value;
    questionModel.value = next;
  }
}

function updateOption(index: number, value: string) {
  if (questionModel.value && questionModel.value.options) {
    const next = { ...questionModel.value };
    if (!next.options) {
      next.options = [];
    } else {
      next.options = next.options.map((opt, i) => (i === index ? value : opt));
    }
    questionModel.value = next;
  }
}

function addOption() {
  if (questionModel.value) {
    const next = { ...questionModel.value };
    if (!next.options) {
      next.options = [];
    }
    next.options = [...next.options, `选项${next.options.length + 1}`];
    questionModel.value = next;
  }
}

function removeOption(index: number) {
  if (questionModel.value && questionModel.value.options) {
    if (questionModel.value.options.length > 1) {
      const next = { ...questionModel.value };
      if (!next.options) {
        next.options = [];
      }
      const removedValue = next.options[index];
      next.options = next.options.filter((_, i) => i !== index);
      if (
        !Array.isArray(next.defaultValue) &&
        next.defaultValue === removedValue
      ) {
        next.defaultValue = "";
      }
      questionModel.value = next;
    }
  }
}

function addDependencyRule() {
  if (questionModel.value) {
    const next = { ...questionModel.value };
    if (!next.dependsOn) {
      next.dependsOn = [];
    }
    next.dependsOn = [
      ...next.dependsOn,
      { questionId: "", hasValue: true, visible: true },
    ];
    questionModel.value = next;
  }
}

function removeDependencyRule(index: number) {
  if (questionModel.value && questionModel.value.dependsOn) {
    const next = { ...questionModel.value };
    if (!next.dependsOn) {
      next.dependsOn = [];
      console.log("dependsOn 为空，已创建空数组");
    }
    next.dependsOn = next.dependsOn.filter((_, i) => i !== index);
    questionModel.value = next;
  }
}

function updateDependencyRule<K extends keyof DependencyRule>(
  index: number,
  field: K,
  value: DependencyRule[K],
) {
  console.log(index, field, value);
  if (questionModel.value && questionModel.value.dependsOn) {
    const next = { ...questionModel.value };
    if (!next.dependsOn) {
      next.dependsOn = [];
      console.log("dependsOn 为空，已创建空数组");
    }
    next.dependsOn = next.dependsOn.map((rule, i) =>
      i === index ? { ...rule, [field]: value } : rule,
    );
    questionModel.value = next;
  }
}
</script>

<style scoped>
.config-panel h3 {
  margin-top: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-bottom: 8px;
}
.option-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.empty-tip {
  margin-top: 40px;
  text-align: center;
}
.dependency-section {
  padding: 16px 0;
}
.dependency-section h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
}
.dependency-rule {
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  margin-bottom: 12px;
  background: var(--el-fill-color-light);
}
</style>
