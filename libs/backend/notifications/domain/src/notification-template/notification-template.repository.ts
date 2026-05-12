import type { NotificationTemplate } from './notification-template.aggregate';
import type { TemplateCode } from '../value-objects/template-code';

export interface INotificationTemplateRepository {
  findByCode(code: TemplateCode): Promise<NotificationTemplate | null>;
  findAll(): Promise<NotificationTemplate[]>;
  save(template: NotificationTemplate): Promise<void>;
}
