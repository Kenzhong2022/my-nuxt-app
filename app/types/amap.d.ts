/// <reference types="@vuemap/amap-jsapi-types" />

declare global {
  namespace AMap {
    interface GeolocationOptions {
      enableHighAccuracy?: boolean;
      timeout?: number;
      needAddress?: boolean;
      extensions?: 'base' | 'all';
      showButton?: boolean;
      showMarker?: boolean;
      showCircle?: boolean;
      panToLocation?: boolean;
      zoomToAccuracy?: boolean;
      position?:
        | 'LT'
        | 'RT'
        | 'LB'
        | 'RB'
        | 'TC'
        | 'BC'
        | 'LC'
        | 'RC'
        | { top?: string; right?: string; bottom?: string; left?: string };
    }

    interface GeolocationResult {
      position: { lng: number; lat: number };
      accuracy: number;
      location_type?: string;
      formattedAddress?: string;
      addressComponent?: Record<string, any>;
      message?: string;
    }

    class Geolocation {
      constructor(options?: GeolocationOptions);
      getCurrentPosition(callback: (status: 'complete' | 'error', result: GeolocationResult) => void): void;
      getCityInfo(callback: (status: string, result: any) => void): void;
      isSupported(): boolean;
    }
  }
}

export {};
