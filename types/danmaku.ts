// types/danmaku.ts
export interface DanmakuItem extends DanmakuStyle {
  /** 弹幕文本 */
  text: string;
}

interface DanmakuStyle {
  /** 弹幕水平坐标 */
  x: number;
  /** 弹幕垂直坐标 */
  y: number;
  /** 弹幕移动速度 */
  speed: number;
  /** 弹幕颜色 */
  color: string;
  /** 弹幕字体大小 */
  fontSize: number;
}
