import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  OtpCodeHash,
  OtpPurpose,
  OtpRequest,
  type IOtpRequestRepository,
} from '@det/backend-iam-domain';
import { CLOCK, ID_GENERATOR, PhoneNumber } from '@det/backend-shared-ddd';
import type { IClock, IIdGenerator } from '@det/backend-shared-ddd';

import { RequestOtpCommand } from './request-otp.command';
import { HASH_FN, OTP_REQUEST_REPOSITORY, SMS_OTP, TOKEN_GENERATOR } from '../../di/tokens';

import type { ISmsOtpPort } from '../../ports/sms-otp/sms-otp.port';
import type { ITokenGenerator } from '../../ports/token-generator/token-generator.port';

@CommandHandler(RequestOtpCommand)
export class RequestOtpHandler implements ICommandHandler<RequestOtpCommand, void> {
  constructor(
    @Inject(OTP_REQUEST_REPOSITORY) private readonly otpRepo: IOtpRequestRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokenGen: ITokenGenerator,
    @Inject(SMS_OTP) private readonly smsOtp: ISmsOtpPort,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(ID_GENERATOR) private readonly idGen: IIdGenerator,
    @Inject(HASH_FN) private readonly hashFn: (value: string) => string,
  ) {}

  async execute(cmd: RequestOtpCommand): Promise<void> {
    const phone = PhoneNumber.from(cmd.phone);
    const now = this.clock.now();
    const { raw, hash } = this.tokenGen.generateOtpCode();

    const hashFn = this.hashFn;
    const codeHash = OtpCodeHash.fromHash(
      hash,
      (rawCode, storedHash) => hashFn(rawCode) === storedHash,
    );

    const otpRequest = OtpRequest.request({
      codeHash,
      idGen: this.idGen,
      now,
      phone,
      purpose: OtpPurpose.LOGIN,
      rawCode: raw,
    });

    await this.otpRepo.save(otpRequest);
    await this.smsOtp.send(phone.toString(), raw);
  }
}
