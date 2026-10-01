// types/useAmap.ts —— useAmap 的类型契约（与实现分离，供调用方 import type）

/** useAmap 返回的定位结果 */
export interface AmapLocation {
  lng: number;
  lat: number;
  address?: string;
  accuracy?: number;
  raw: any;
}

/**
 * useAmap 初始化完成后的返回集合（一次拿到高德命名空间、地图实例与封装方法）
 *
 * 获取方式（异步：首次调用需动态加载高德 JS SDK v2.0）：
 *   const amap = await useAmap(containerRef.value);
 *   amap.AMap;                                              // 命名空间：new Marker / InfoWindow 等
 *   amap.map.setCenter([lng, lat]);                         // 地图实例：视角 / 缩放 / 事件监听
 *   const { lng, lat, address } = await amap.getLocation(); // 封装好的定位
 *
 * 实例行为：
 *   - 全局单例：重复调用返回首次创建的 bundle，container 与 options 仅首次初始化生效；
 *     加载进度经 amapState（mapLoading / locating / isLoaded / error）观测（composables/useAmap.ts）
 *   - 预置插件：AMap.Geolocation（geolocation 字段，视觉控件已关闭由页面接管）、
 *     AMap.Geocoder（geocoder 字段，默认 radius 1000 / extensions all）
 *
 * 生命周期：map 由调用方负责销毁（onBeforeUnmount 中 map.destroy()），
 * Marker / Circle 等覆盖物随 map.destroy() 一并回收。
 */
export interface AmapBundle {
  /**
   * AMap 命名空间（值本身，不是类型）
   *
   * 类型：`typeof window.AMap`
   * 用途：创建高德的各种覆盖物与插件，如：
   *   - new amap.AMap.Marker({ position, map })
   *   - new amap.AMap.InfoWindow({ content })
   *   - new amap.AMap.Polyline({ path, map })
   *
   * 注意：AMapLoader.load() 返回的是 any，
   *       useAmap 内部已断言为 AMap 命名空间，这里直接使用即可。
   */
  AMap: typeof window.AMap;

  /**
   * 地图实例
   *
   * 类型：`AMap.Map`
   * 用途：操作地图本身，如：
   *   - map.setCenter([lng, lat])  设置中心点
   *   - map.setZoom(15)            设置缩放级别
   *   - map.on('click', handler)   监听地图事件
   *   - map.destroy()              销毁地图（组件卸载时必须调用）
   *
   * 注意：组件 onBeforeUnmount 里务必调用 map.destroy()，
   *       否则会造成内存泄漏。
   */
  map: AMap.Map;

  /**
   * 定位控件实例
   *
   * 类型：`AMap.Geolocation`
   * 用途：控件已通过 map.addControl() 挂到地图上，
   *       一般不需要直接操作它；
   *       若需手动触发定位/取城市信息，可调用其方法：
   *   - geolocation.getCurrentPosition(cb)  获取当前位置
   *   - geolocation.getCityInfo(cb)         获取当前城市
   *
   * 提示：绝大多数场景用下方封装好的 getLocation() 即可，
   *       无需直接使用此实例。
   */
  geolocation: AMap.Geolocation;

  /**
   * 获取用户当前位置（已封装为 Promise）
   *
   * 类型：`() => Promise<AmapLocation>`
   * 返回：AmapLocation 对象，含经纬度、地址、精度等
   * 失败：reject(Error)，常见原因：
   *   - 用户拒绝授权
   *   - 非 HTTPS / localhost 环境
   *   - 定位超时（默认 10s）
   *
   * 注意：不要放在 onMounted 里自动调用，
   *       建议绑定到用户点击事件，否则浏览器可能拒绝授权。
   *
   * 用法：
   *   try {
   *     const { lng, lat, address } = await amap.getLocation();
   *   } catch (e) {
   *     console.error((e as Error).message);
   *   }
   */
  getLocation: () => Promise<AmapLocation>;

  createMarker: (
    position: [number, number],
    options?: Partial<AMap.MarkerOptions>,
  ) => {
    marker: AMap.Marker;
    setIcon: (icon: string | AMap.Icon) => void;
    setContent: (c: string | HTMLElement) => void;
    setPosition: (pos: [number, number]) => void;
    destroy: () => void;
  };

  /**
   * 创建圆形覆盖物（用于定位精度圈）
   *
   * 类型：`(center: [number, number], radius: number, options?) => CircleApi`
   * 参数：center 圆心经纬度；radius 半径（单位：米）
   * 说明：AMap.Circle 属于核心 API，不依赖任何插件；
   *       返回的 API 支持换圆心 / 换半径 / 从地图移除，
   *       便于页面在定位与点击选点间复用同一个实例。
   */
  createCircle: (
    center: [number, number],
    radius: number,
    options?: Partial<AMap.CircleOptions>,
  ) => {
    circle: AMap.Circle;
    setCenter: (c: [number, number]) => void;
    setRadius: (r: number) => void;
    destroy: () => void;
  };
  geocoder: AMap.Geocoder;

  /**
   * 切换底图亮/暗主题（跟随页面暗色模式）
   *
   * 类型：`(dark: boolean) => void`
   * 参数：true = 暗色「幻影黑」(amap://styles/dark)，false = 亮色「标准白天」(amap://styles/normal)
   * 行为：内部调用 map.setMapStyle() 重载瓦片，期间自动置 amapState.mapLoading 盖遮罩；
   *       切换瞬间闪烁属正常现象
   *
   * 注意：complete 事件只在首次瓦片加载触发一次，样式切换不会再次触发，
   *       加载态由内部定时器兜底还原，无需调用方管理
   */
  setMapTheme: (dark: boolean) => void;
}
