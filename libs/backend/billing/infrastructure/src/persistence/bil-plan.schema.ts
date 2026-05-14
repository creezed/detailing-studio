import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'bil_plan' })
export class BilPlanSchema {
  @PrimaryKey({ type: 'text' })
  declare code: string;

  @Property({ type: 'text' })
  declare name: string;

  @Property({ fieldName: 'price_cents_per_month', type: 'bigint' })
  declare priceCentsPerMonth: string;

  @Property({ fieldName: 'max_branches', nullable: true, type: 'int' })
  declare maxBranches: number | null;

  @Property({ fieldName: 'max_masters', nullable: true, type: 'int' })
  declare maxMasters: number | null;

  @Property({ fieldName: 'max_appointments_per_month', nullable: true, type: 'int' })
  declare maxAppointmentsPerMonth: number | null;

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @Property({ fieldName: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
