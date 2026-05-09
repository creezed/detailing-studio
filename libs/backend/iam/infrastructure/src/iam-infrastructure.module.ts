import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, type OnModuleInit, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CLOCK,
  HASH_FN,
  ID_GENERATOR,
  INVITATION_REPOSITORY,
  IamApplicationModule,
  JWT_ISSUER,
  OTP_REQUEST_REPOSITORY,
  PASSWORD_HASHER,
  REFRESH_SESSION_REPOSITORY,
  SMS_OTP,
  TOKEN_GENERATOR,
  USER_REPOSITORY,
} from '@det/backend-iam-application';
import {
  InvitationAccepted,
  InvitationExpired,
  InvitationIssued,
  InvitationRevoked,
  OtpRequestFailed,
  OtpRequestIssued,
  OtpRequestVerified,
  RefreshSessionCompromised,
  RefreshSessionIssued,
  RefreshSessionRevoked,
  RefreshSessionRotated,
  UserActivated,
  UserArchived,
  UserBlocked,
  UserPasswordChanged,
  UserRegistered,
  UserUnblocked,
} from '@det/backend-iam-domain';
import { EventTypeRegistry, OutboxModule } from '@det/backend-shared-outbox';

import { BcryptPasswordHasherAdapter } from './adapters/bcrypt-password-hasher.adapter';
import { CryptoIdGeneratorAdapter } from './adapters/crypto-id-generator.adapter';
import { CryptoTokenGeneratorAdapter, sha256Hash } from './adapters/crypto-token-generator.adapter';
import { JoseJwtIssuerAdapter } from './adapters/jose-jwt-issuer.adapter';
import { LogSmsOtpStubAdapter } from './adapters/log-sms-otp-stub.adapter';
import { NodemailerInvitationMailerStubAdapter } from './adapters/nodemailer-invitation-mailer-stub.adapter';
import { SmsruOtpAdapter } from './adapters/smsru-otp.adapter';
import { SystemClockAdapter } from './adapters/system-clock.adapter';
import { IamInvitationSchema } from './persistence/iam-invitation.schema';
import { IamOtpRequestSchema } from './persistence/iam-otp-request.schema';
import { IamRefreshSessionSchema } from './persistence/iam-refresh-session.schema';
import { IamUserSchema } from './persistence/iam-user.schema';
import { IamInvitationRepository } from './repositories/iam-invitation.repository';
import { IamOtpRequestRepository } from './repositories/iam-otp-request.repository';
import { IamRefreshSessionRepository } from './repositories/iam-refresh-session.repository';
import { IamUserRepository } from './repositories/iam-user.repository';

const IAM_SCHEMAS = [
  IamUserSchema,
  IamInvitationSchema,
  IamOtpRequestSchema,
  IamRefreshSessionSchema,
];

const INFRASTRUCTURE_PROVIDERS: readonly Provider[] = [
  IamUserRepository,
  IamInvitationRepository,
  IamOtpRequestRepository,
  IamRefreshSessionRepository,
  BcryptPasswordHasherAdapter,
  CryptoTokenGeneratorAdapter,
  CryptoIdGeneratorAdapter,
  JoseJwtIssuerAdapter,
  NodemailerInvitationMailerStubAdapter,
  SmsruOtpAdapter,
  LogSmsOtpStubAdapter,
  SystemClockAdapter,
  {
    provide: USER_REPOSITORY,
    useExisting: IamUserRepository,
  },
  {
    provide: INVITATION_REPOSITORY,
    useExisting: IamInvitationRepository,
  },
  {
    provide: OTP_REQUEST_REPOSITORY,
    useExisting: IamOtpRequestRepository,
  },
  {
    provide: REFRESH_SESSION_REPOSITORY,
    useExisting: IamRefreshSessionRepository,
  },
  {
    provide: PASSWORD_HASHER,
    useExisting: BcryptPasswordHasherAdapter,
  },
  {
    provide: TOKEN_GENERATOR,
    useExisting: CryptoTokenGeneratorAdapter,
  },
  {
    provide: JWT_ISSUER,
    useExisting: JoseJwtIssuerAdapter,
  },
  {
    provide: SMS_OTP,
    useFactory: (config: ConfigService, smsru: SmsruOtpAdapter, stub: LogSmsOtpStubAdapter) => {
      const apiKey = config.get<string>('sms.smsRuApiKey') ?? '';

      return apiKey.length > 0 ? smsru : stub;
    },
    inject: [ConfigService, SmsruOtpAdapter, LogSmsOtpStubAdapter],
  },
  {
    provide: ID_GENERATOR,
    useExisting: CryptoIdGeneratorAdapter,
  },
  {
    provide: CLOCK,
    useExisting: SystemClockAdapter,
  },
  {
    provide: HASH_FN,
    useValue: sha256Hash,
  },
];

@Module({
  exports: [IamApplicationModule],
  imports: [
    IamApplicationModule.register(INFRASTRUCTURE_PROVIDERS, [
      MikroOrmModule.forFeature(IAM_SCHEMAS),
      OutboxModule,
    ]),
  ],
})
export class IamInfrastructureModule implements OnModuleInit {
  constructor(private readonly eventRegistry: EventTypeRegistry) {}

  onModuleInit(): void {
    this.eventRegistry.register([
      { ctor: UserRegistered, eventType: 'UserRegistered' },
      { ctor: UserPasswordChanged, eventType: 'UserPasswordChanged' },
      { ctor: UserBlocked, eventType: 'UserBlocked' },
      { ctor: UserUnblocked, eventType: 'UserUnblocked' },
      { ctor: UserActivated, eventType: 'UserActivated' },
      { ctor: UserArchived, eventType: 'UserArchived' },
      { ctor: InvitationIssued, eventType: 'InvitationIssued' },
      { ctor: InvitationAccepted, eventType: 'InvitationAccepted' },
      { ctor: InvitationRevoked, eventType: 'InvitationRevoked' },
      { ctor: InvitationExpired, eventType: 'InvitationExpired' },
      { ctor: OtpRequestIssued, eventType: 'OtpRequestIssued' },
      { ctor: OtpRequestVerified, eventType: 'OtpRequestVerified' },
      { ctor: OtpRequestFailed, eventType: 'OtpRequestFailed' },
      { ctor: RefreshSessionIssued, eventType: 'RefreshSessionIssued' },
      { ctor: RefreshSessionRotated, eventType: 'RefreshSessionRotated' },
      { ctor: RefreshSessionRevoked, eventType: 'RefreshSessionRevoked' },
      { ctor: RefreshSessionCompromised, eventType: 'RefreshSessionCompromised' },
    ]);
  }
}
