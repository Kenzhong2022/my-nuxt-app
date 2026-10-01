import type { ApiResponse } from '~~/types/common';
import type { StoreAddress, AddressPayload } from '~~/types/address';

/**
 * 商城收货地址数据层（/api/store/address 系列接口的统一封装）
 * 供 AddressPicker 组件与结算页共享消费
 */
export const useStoreAddress = () => {
  /**
   * 拉取当前用户地址列表（默认地址置顶）
   */
  const fetchAddresses = async (): Promise<StoreAddress[]> => {
    const res = await $fetch<ApiResponse<{ items: StoreAddress[] } | null>>('/api/store/address');
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || '获取地址失败');
    }
    return res.data.items;
  };

  /**
   * 新增地址，返回服务端生成的完整对象（含 id / 默认标记补位结果）
   */
  const addAddress = async (payload: AddressPayload): Promise<StoreAddress> => {
    const res = await $fetch<ApiResponse<StoreAddress | null>>('/api/store/address', {
      method: 'POST',
      body: payload,
    });
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || '新增地址失败');
    }
    return res.data;
  };

  /**
   * 修改地址（isDefault=true 时服务端原子转移默认标记）
   */
  const updateAddress = async (id: number, payload: AddressPayload): Promise<StoreAddress> => {
    const res = await $fetch<ApiResponse<StoreAddress | null>>(`/api/store/address/${id}`, {
      method: 'PUT',
      body: payload,
    });
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || '修改地址失败');
    }
    return res.data;
  };

  /**
   * 删除地址（删的是默认地址时服务端自动补位）
   */
  const removeAddress = async (id: number): Promise<void> => {
    const res = await $fetch<ApiResponse<null>>(`/api/store/address/${id}`, {
      method: 'DELETE',
    });
    if (res.code !== 200) {
      throw new Error(res.message || '删除地址失败');
    }
  };

  /**
   * 设为默认地址
   */
  const setDefaultAddress = async (id: number): Promise<void> => {
    const res = await $fetch<ApiResponse<null>>(`/api/store/address/${id}/default`, {
      method: 'PUT',
    });
    if (res.code !== 200) {
      throw new Error(res.message || '设置默认地址失败');
    }
  };

  return { fetchAddresses, addAddress, updateAddress, removeAddress, setDefaultAddress };
};
