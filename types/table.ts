import type { VNode, ComponentProps } from 'vue';
import { ElTableColumn } from 'element-plus';

// 提取 ElTableColumn 的 Props 类型
type TableColumnProps = ComponentProps<typeof ElTableColumn>;

export interface ColumnConfig<T = any> extends Partial<Omit<TableColumnProps, 'prop' | 'label'>> {
  /** 字段名（如果使用 render 或插槽可不填） */
  prop?: keyof T | string;
  /** 列标题 */
  label?: string;
  /** 自定义渲染函数，返回 VNode 或字符串/数字 */
  render?: (row: T, column: ColumnConfig<T>, index: number) => VNode | string | number;
  /** 具名插槽名称，如果提供且父组件传入了同名插槽，则优先使用插槽渲染 */
  slot?: string;
}
