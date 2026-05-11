import { CLOCK, ID_GENERATOR } from '@det/backend-shared-ddd';

export const WORK_ORDER_REPOSITORY = Symbol('WORK_ORDER_REPOSITORY');
export const WORK_ORDER_READ_PORT = Symbol('WORK_ORDER_READ_PORT');
export const PHOTO_STORAGE_PORT = Symbol('PHOTO_STORAGE_PORT');
export const CATALOG_NORM_PORT = Symbol('CATALOG_NORM_PORT');
export const CATALOG_SKU_PORT = Symbol('CATALOG_SKU_PORT');
export const IAM_USER_PORT = Symbol('IAM_USER_PORT');
export const CRM_CLIENT_PORT = Symbol('CRM_CLIENT_PORT');
export const CRM_VEHICLE_PORT = Symbol('CRM_VEHICLE_PORT');
export const SCHEDULING_APPOINTMENT_PORT = Symbol('SCHEDULING_APPOINTMENT_PORT');
export const INVENTORY_STOCK_PORT = Symbol('INVENTORY_STOCK_PORT');

export { CLOCK, ID_GENERATOR };
