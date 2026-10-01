// types/address.ts —— 商城收货地址类型契约（server 与 app 共用）

/** 收货地址（store_addresses 表的对外结构，驼峰命名） */
export interface StoreAddress {
  id: number;
  /** 收件人姓名 */
  receiver: string;
  /** 手机号（11 位大陆号段） */
  phone: string;
  /** 省市区（级联选择拼接，如 "广东省 深圳市 南山区"） */
  region: string;
  /** 详细地址（街道门牌） */
  detail: string;
  /** 是否默认地址（每用户至多一条 true） */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 新增/修改地址的提交载荷（编辑时 id 走路径参数） */
export interface AddressPayload {
  receiver: string;
  phone: string;
  region: string;
  detail: string;
  isDefault?: boolean;
}
