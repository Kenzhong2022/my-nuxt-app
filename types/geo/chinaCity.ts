/**
 * public/geo/china-city.json 的类型定义
 *
 * 数据形态：标准的 GeoJSON（RFC 7946）FeatureCollection，
 * 描述全国 477 个行政区边界，几何类型统一为 MultiPolygon。
 * 结构经 scripts/analyzeChinaCity.mjs 抽取确认：
 *   root ->
 *   ├─ type: "FeatureCollection"
 *   └─ features: Feature[]（477 条）
 *       ├─ type: "Feature"
 *       ├─ properties（三种 level 字段一致）
 *       └─ geometry（仅 MultiPolygon）
 *
 * 加载用法：
 *   import chinaCity from '~/public/geo/china-city.json'  // 需 tsconfig 开启 resolveJsonModule
 *   const data = chinaCity as ChinaCityGeoJSON;
 */

/** 单个坐标点：经度在前、纬度在后（遵循 GeoJSON 的 [lng, lat] 顺序） */
export type LngLat = [number, number];

/** 行政层级：省 → 市 → 区县 */
export type AdminLevel = 'province' | 'city' | 'district';

/**
 * Feature 的 properties：三种 adminLevel 的字段完全一致，仅 name/adcode/level 的含义随层级变化
 */
export interface ChinaCityFeatureProperties {
  /** 行政区划编码（国家统计局 6 位编码），如 110101 表示北京市东城区 */
  adcode: number;
  /** 行政区名称，如 "东城区" */
  name: string;
  /** 中心点坐标（用于地图定位/标注落点） */
  center: LngLat;
  /**
   * 几何质心坐标（用于行政区标签自动落脚）。
   * 注意：部分 district 层级 feature 缺失质心，会以 null 返回，使用前需判空。
   */
  centroid: LngLat | null;
  /** 子级行政区数量；0 表示该层级无下钻子级（如区县一般无下级） */
  childrenNum: number;
  /** 行政层级，决定其在省份下钻链中的位置 */
  level: AdminLevel;
  /** 直接父级的行政编码（仅存父级 adcode，不含父级名称） */
  parent: {
    /** 父级行政区划编码，如东城区父级为 110000（北京市） */
    adcode: number;
  };
  /** 在源数据子特性集合中的索引号（序列化/动画时可辅助定位） */
  subFeatureIndex: number;
  /**
   * 从根到自身的全部祖先行政编码链路（由大到小）。
   * 例：东城区 → [100000（全国）, 110000（北京市）]
   */
  acroutes: number[];
}

/**
 * GeoJSON 几何：本文件统一为 MultiPolygon（单个 feature 可能含多个不连续的多边形）。
 * coordinates 四层嵌套含义：[polygon][ring][point][lng, lat]
 *   - 第一层：多个多边形（polygon）
 *   - 第二层：多边形的「环」，首尾坐标相同以闭合，环第 0 个为外环、其后为孔洞
 *   - 第三层：单个坐标点
 *   - 第四层：即 [lng, lat] 的经纬度对
 */
export interface ChinaCityGeometry {
  type: 'MultiPolygon';
  /** [polygon][ring][point][lng,lat] 的四维坐标数组 */
  coordinates: number[][][][];
}

/** 单条行政区 Feature（properties + 边界几何） */
export interface ChinaCityFeature {
  type: 'Feature';
  properties: ChinaCityFeatureProperties;
  geometry: ChinaCityGeometry;
}

/** china-city.json 根结构 */
export interface ChinaCityGeoJSON {
  /** 依据 RFC 7946 固定标记为 FeatureCollection */
  type: 'FeatureCollection';
  /** 行政区边界 Feature 列表（共 477 条，覆盖省/市/区县三级） */
  features: ChinaCityFeature[];
}