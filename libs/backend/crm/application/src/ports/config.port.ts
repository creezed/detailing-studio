export const CRM_CONFIG_PORT = Symbol('CRM_CONFIG_PORT');

export interface ICrmConfigPort {
  getCurrentPolicyVersion(): string;
}
