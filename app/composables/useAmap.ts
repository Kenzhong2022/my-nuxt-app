// composables/useAmap.ts

// 类型契约已抽离到 app/types/useAmap.ts（AmapLocation / AmapBundle）
import type { AmapBundle, AmapLocation } from '~/types/useAmap';

export type { AmapBundle, AmapLocation };

// AMap 命名空间的值类型
type AMapNS = typeof window.AMap;

const buildOptions = (options?: Partial<AMap.MapOptions>): AMap.MapOptions => {
  return {
    viewMode: '2D',
    zoom: 11,
    center: [116.397428, 39.90923],
    doubleClickZoom: false,
    ...options,
  };
};

export const useAmap = async (container: HTMLDivElement, options?: Partial<AMap.MapOptions>): Promise<AmapBundle> => {
  if (!container || !(container instanceof HTMLDivElement)) {
    throw new Error('container 必须是 HTMLDivElement 元素');
  }

  const { amapKey, amapSecurityCode } = useRuntimeConfig().public;

  const { default: AMapLoader } = await import('@amap/amap-jsapi-loader');

  (window as any)._AMapSecurityConfig = {
    securityJsCode: amapSecurityCode,
  };

  const AMap = (await AMapLoader.load({
    key: amapKey,
    version: '2.0',
    plugins: ['AMap.Geolocation', 'AMap.Geocoder'],
  })) as AMapNS;

  const map = new AMap.Map(container, buildOptions(options));

  // 实例化（复用同一个）
  const geocoder = new AMap.Geocoder({
    radius: 1000,
    extensions: 'all', // 必须 all，才会返回 pois
  });

  /**
   * @description 定位控件实例
   * @param options 定位控件选项
   */
  const geolocation = new AMap.Geolocation({
    // —— 定位能力 ——
    enableHighAccuracy: true, // 高精度
    timeout: 10000, // 10秒超时
    needAddress: true, // 需要地址
    extensions: 'all', // 详细地址信息

    // —— 视觉控制（全部关闭，由页面接管）——
    showButton: false, // 不显示控件自带按钮
    showMarker: false, // 不显示自动标记
    showCircle: false, // 不显示自动精度圈
    panToLocation: false, // 不自动平移地图
    zoomToAccuracy: false, // 不自动调整缩放
  });

  map.addControl(geolocation);

  /**
   * @description 获取用户当前位置（已封装为 Promise）
   * @returns AmapLocation 对象，含经纬度、地址、精度等
   */
  const getLocation = (): Promise<AmapLocation> => {
    return new Promise((resolve, reject) => {
      geolocation.getCurrentPosition((status, result) => {
        if (status === 'complete') {
          resolve({
            lng: result.position.lng,
            lat: result.position.lat,
            address: result.formattedAddress,
            accuracy: result.accuracy,
            raw: result,
          });
        } else {
          reject(new Error(result.message || '定位失败'));
        }
      });
    });
  };

  /**
   * @description 创建地图上的标记（Marker）
   * @param position 标记位置
   * @param options 标记选项
   * @returns
   *  - marker: AMap.Marker 实例，用于后续操作
   *  - setIcon: 换图标
   *  - setContent: 换内容
   *  - setPosition: 换位置（新增，复用实例的关键）
   *  - destroy: 从地图移除
   */
  const createMarker = (position: [number, number], options: Partial<AMap.MarkerOptions> = {}) => {
    const marker = new AMap.Marker({ position, ...options });
    map.add(marker);

    return {
      marker,
      setIcon: (icon: string | AMap.Icon) => marker.setIcon(icon),
      setContent: (c: string | HTMLElement) => marker.setContent(c),
      setPosition: (pos: [number, number]) => marker.setPosition(pos),
      destroy: () => map.remove(marker),
    };
  };

  /**
   * @description 创建圆形上的精度圈（定位精度圈）
   * @param center 圆心位置
   * @param radius 半径（米）
   * @param options 圆圈选项
   * @returns
   *  - circle: AMap.Circle 实例，用于后续操作
   *  - setCenter: 换圆心
   *  - setRadius: 换半径（米）
   *  - destroy: 从地图移除
   */
  const createCircle = (center: [number, number], radius: number, options: Partial<AMap.CircleOptions> = {}) => {
    const circle = new AMap.Circle({
      cursor: 'pointer',
      bubble: true,
      center,
      radius,
      strokeColor: '#409eff',
      strokeWeight: 1,
      strokeOpacity: 0.6,
      fillColor: '#409eff',
      fillOpacity: 0.15,
      ...options,
    });
    map.add(circle);

    return {
      circle,
      setCenter: (c: [number, number]) => circle.setCenter(c),
      setRadius: (r: number) => circle.setRadius(r),
      destroy: () => map.remove(circle),
    };
  };

  return { AMap, map, geolocation, getLocation, createMarker, createCircle, geocoder };
};
