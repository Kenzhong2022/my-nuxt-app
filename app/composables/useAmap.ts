// composables/useAmap.ts

/** useAmap 返回的定位结果 */
export interface AmapLocation {
  lng: number;
  lat: number;
  address?: string;
  accuracy?: number;
  raw: any;
}

/** useAmap 的返回值契约 */
export interface AmapBundle {
  /**
   * AMap 命名空间的值类型
   */
  AMap: typeof window.AMap;
  /**
   * 地图 实例
   */
  map: AMap.Map;
  /**
   * @description 定位 实例
   */
  geolocation: AMap.Geolocation;
  /**
   * 获取定位结果的函数
   */
  getLocation: () => Promise<AmapLocation>;
}

// AMap 命名空间的值类型
type AMapNS = typeof window.AMap;

const buildOptions = (options?: Partial<AMap.MapOptions>): AMap.MapOptions => {
  return {
    viewMode: '2D',
    zoom: 11,
    center: [116.397428, 39.90923],
    ...options,
  };
};

export const useAmap = async (container: HTMLDivElement, options?: Partial<AMap.MapOptions>): Promise<AmapBundle> => {
  if (!container || !(container instanceof HTMLDivElement)) {
    throw new Error('container 必须是 HTMLDivElement 元素');
  }

  const { amapKey, amapSecurityCode } = useRuntimeConfig().public;

  const { default: AMapLoader } = await import('@amap/amap-jsapi-loader');

  window._AMapSecurityConfig = {
    securityJsCode: amapSecurityCode,
  };

  const AMap = (await AMapLoader.load({
    key: amapKey,
    version: '2.0',
    plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation'],
  })) as AMapNS;

  const map = new AMap.Map(container, buildOptions(options));
  map.addControl(new AMap.Scale());

  const geolocation = new AMap.Geolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    needAddress: true,
    extensions: 'all',
    showButton: false,
    showMarker: true,
    showCircle: true,
    panToLocation: true,
    zoomToAccuracy: true,
  });
  map.addControl(geolocation);

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

  return { AMap, map, geolocation, getLocation };
};
