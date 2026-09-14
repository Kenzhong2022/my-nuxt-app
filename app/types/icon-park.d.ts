// types/icon-park.d.ts
import type { IconParkProps } from '@icon-park/vue-next';

declare module 'vue' {
  export interface GlobalComponents {
    // 全局所有 i-park-* 组件类型
    [key: `i-park-${string}`]: DefineComponent<IconParkProps>;
  }
}
