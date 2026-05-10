export type ConsumptionReason =
  | { readonly type: 'WORK_ORDER'; readonly workOrderId: string }
  | { readonly type: 'MANUAL'; readonly comment: string }
  | { readonly type: 'SAMPLE'; readonly comment: string }
  | { readonly type: 'ADJUSTMENT'; readonly reason: string };
