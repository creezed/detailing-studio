/* eslint-disable @typescript-eslint/unbound-method */
import { IssueNotificationCommand } from '@det/backend-notifications-application';

import { IssueAndSendProcessor } from './issue-and-send.processor';

import type { CommandBus } from '@nestjs/cqrs';
import type { Job } from 'bullmq';

describe('IssueAndSendProcessor', () => {
  let processor: IssueAndSendProcessor;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(() => {
    commandBus = {
      execute: jest.fn().mockResolvedValue({ notificationIds: ['n-1'], deduped: [false] }),
    } as unknown as jest.Mocked<CommandBus>;

    processor = new IssueAndSendProcessor(commandBus);
  });

  it('parses commandJson and issues via CommandBus', async () => {
    const cmd = new IssueNotificationCommand(
      { kind: 'email', email: 'test@test.com' },
      'USER_REGISTERED',
      {} as any,
    );

    const job = {
      data: { commandJson: JSON.stringify(cmd) },
      id: 'reminder-1',
    } as Job<{ commandJson: string }>;

    await processor.process(job);

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const executedCmd = commandBus.execute.mock.calls[0]?.[0] as IssueNotificationCommand;

    expect(executedCmd).toBeInstanceOf(IssueNotificationCommand);
    expect(executedCmd.templateCode).toBe('USER_REGISTERED');
  });

  it('skips invalid payload gracefully', async () => {
    const job = {
      data: { commandJson: '"just a string"' },
      id: 'bad-1',
    } as Job<{ commandJson: string }>;

    await processor.process(job);

    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});
