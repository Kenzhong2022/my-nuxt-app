// composables/useAmap.ts
import { ref } from 'vue';
// 类型契约已抽离到 app/types/useAmap.ts（AmapLocation / AmapBundle）
import type { AmapBundle, AmapLocation } from '~/types/useAmap';
export type { AmapBundle, AmapLocation };
// AMap 命名空间的值类型
type AMapNS = typeof window.AMap;

/**
 * @description 高德地图全局加载状态
 * - mapLoading：SDK下载 + 瓦片渲染全部过程，直到地图可操作才关闭（地图遮罩）
 * - locating：定位请求进行中（getCurrentPosition 调用期间，按钮转圈/局部提示）
 * - isLoaded：地图 complete 事件触发后标记，代表用户可交互
 * - error：import / AMapLoader.load / 初始化阶段异常
 *
 * 两个加载态分离的原因：定位依赖用户授权（可拒绝、可长时间等待），
 * 与瓦片渲染（基础设施就绪）是正交生命周期，混用会让定位阻塞地图遮罩
 */
export const amapState = {
  /**
   * @description 地图加载中（SDK脚本下载 + 瓦片渲染全过程）
   */
  mapLoading: ref(false),
  /**
   * @description 定位进行中（getLocation 调用期间自动扭转）
   */
  locating: ref(false),
  /**
   * @description 地图渲染完成，用户可拖拽缩放操作
   */
  isLoaded: ref(false),
  /**
   * @description 加载错误信息
   * */
  error: ref<Error | null>(null),
};

/**
 * @description Promise缓存，防止并发重复加载
 */
let loadPromise: Promise<AmapBundle> | null = null;

/**
 * @description 缓存已经初始化完成的bundle实例
 */
let bundleCache: AmapBundle | null = null;

/**
 * @description 重置高德全部状态与缓存，用于路由离开、销毁重建地图场景
 */
export function resetAmapState() {
  bundleCache = null;
  loadPromise = null;
  amapState.mapLoading.value = false;
  amapState.locating.value = false;
  amapState.isLoaded.value = false;
  amapState.error.value = null;
}

// —— 底图亮/暗样式 ——（JS API 无夜景枚举，全部经 mapStyle 样式串控制）
const LIGHT_MAP_STYLE = 'amap://styles/normal';
const DARK_MAP_STYLE = 'amap://styles/dark';

const buildOptions = (options?: Partial<AMap.MapOptions>): AMap.MapOptions => {
  return {
    viewMode: '2D',
    zoom: 11,
    center: [116.397428, 39.90923],
    doubleClickZoom: false,
    // 初始化时读取 html.dark（Element Plus 暗色切换同源）写入底图主题；外部传 mapStyle 可覆盖
    mapStyle: document.documentElement.classList.contains('dark') ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
    ...options,
  };
};

/**
 * @description 初始化高德地图实例
 * @param container 地图容器元素（必须是 HTMLDivElement 元素）
 * @param options 地图选项（可选）
 * @returns 地图实例对象（包含定位、编码件等）
 */
export const useAmap = async (container: HTMLDivElement, options?: Partial<AMap.MapOptions>): Promise<AmapBundle> => {
  if (!container || !(container instanceof HTMLDivElement)) {
    throw new Error('container 必须是 HTMLDivElement 元素');
  }

  // 已有实例直接返回
  if (bundleCache) {
    return bundleCache;
  }

  // 正在加载，复用pending Promise
  if (loadPromise) {
    return loadPromise;
  }

  // 置为加载中，清空旧错误
  amapState.mapLoading.value = true;
  amapState.isLoaded.value = false;
  amapState.error.value = null;

  const { amapKey, amapSecurityCode } = useRuntimeConfig().public;

  loadPromise = (async () => {
    try {
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

      // 官方写法：地图图块加载完成后触发 complete，此时地图可交互；
      // 加载态在此扭转（遮罩盖到渲染完成时刻），后续初始化操作也可在此回调中执行
      map.on('complete', () => {
        console.log('[useAmap] 地图图块加载完成（complete），地图可交互');
        amapState.isLoaded.value = true;
        amapState.mapLoading.value = false;
      });

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
        // 定位期间置定位态（页面按钮转圈/局部提示消费，不影响地图遮罩 mapLoading）
        amapState.locating.value = true;
        return new Promise((resolve, reject) => {
          geolocation.getCurrentPosition((status, result) => {
            // 定位结束统一还原定位态：成功/失败共用一处，避免分支遗漏
            amapState.locating.value = false;
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
       *  - setPosition: 换位置（复用实例的关键）
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

      // setMapStyle 重载瓦片但不会再次触发 complete，加载态用定时器兜底还原
      let styleTimer: ReturnType<typeof setTimeout> | null = null;

      /**
       * @description 切换底图亮/暗主题（跟随页面暗色模式）
       * @param dark true=暗色「幻影黑」，false=亮色「标准白天」
       */
      const setMapTheme = (dark: boolean) => {
        if (styleTimer) clearTimeout(styleTimer); // 连续切换时取消上一次的兜底
        amapState.mapLoading.value = true; // 遮罩盖住瓦片重载过程
        map.setMapStyle(dark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE);
        styleTimer = setTimeout(() => {
          styleTimer = null;
          amapState.mapLoading.value = false;
        }, 800);
      };

      const bundle: AmapBundle = {
        AMap,
        map,
        geolocation,
        getLocation,
        createMarker,
        createCircle,
        geocoder,
        setMapTheme,
      };
      bundleCache = bundle;

      return bundle;
    } catch (err) {
      // 异常保存错误对象
      const e = err instanceof Error ? err : new Error(String(err));
      amapState.error.value = e;
      amapState.mapLoading.value = false;
      throw e;
    } finally {
      loadPromise = null; // 清空pending标记
    }
  })();

  return loadPromise;
};
