/* eslint-disable @typescript-eslint/unbound-method */
import { ServiceCategory, ServiceCategoryId } from '@det/backend/catalog/domain';
import type { IServiceCategoryRepository } from '@det/backend/catalog/domain';
import { DateTime } from '@det/backend/shared/ddd';
import type { IClock, IIdGenerator } from '@det/backend/shared/ddd';

import { CreateServiceCategoryCommand } from '../commands/create-service-category/create-service-category.command';
import { CreateServiceCategoryHandler } from '../commands/create-service-category/create-service-category.handler';
import { DeactivateServiceCategoryCommand } from '../commands/deactivate-service-category/deactivate-service-category.command';
import { DeactivateServiceCategoryHandler } from '../commands/deactivate-service-category/deactivate-service-category.handler';
import { UpdateServiceCategoryCommand } from '../commands/update-service-category/update-service-category.command';
import { UpdateServiceCategoryHandler } from '../commands/update-service-category/update-service-category.handler';
import { ServiceCategoryNotFoundError } from '../errors/application.errors';
import { ListServiceCategoriesHandler } from '../queries/list-service-categories/list-service-categories.handler';
import { ListServiceCategoriesQuery } from '../queries/list-service-categories/list-service-categories.query';

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const NOW = DateTime.from('2026-01-01T10:00:00.000Z');

function mockIdGen(): IIdGenerator {
  return { generate: jest.fn().mockReturnValue(CATEGORY_ID) };
}

function mockClock(): IClock {
  return { now: jest.fn().mockReturnValue(NOW) };
}

function mockRepo(): jest.Mocked<IServiceCategoryRepository> {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    // eslint-disable-next-line unicorn/no-useless-undefined
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function existingCategory(
  overrides: Partial<{ isActive: boolean; name: string }> = {},
): ServiceCategory {
  return ServiceCategory.restore({
    displayOrder: 1,
    icon: 'icon',
    id: CATEGORY_ID,
    isActive: overrides.isActive ?? true,
    name: overrides.name ?? 'Полировка',
  });
}

describe('CreateServiceCategoryHandler', () => {
  it('creates category and returns id', async () => {
    const repo = mockRepo();
    const handler = new CreateServiceCategoryHandler(repo, mockIdGen(), mockClock());

    const result = await handler.execute(
      new CreateServiceCategoryCommand('Полировка', 'polish-icon', 1),
    );

    expect(result).toBe(CATEGORY_ID);
    expect(repo.save).toHaveBeenCalledTimes(1);

    const saved = repo.save.mock.calls[0]?.[0];
    const snapshot = saved?.toSnapshot();
    expect(snapshot).toMatchObject({
      displayOrder: 1,
      icon: 'polish-icon',
      isActive: true,
      name: 'Полировка',
    });
  });
});

describe('UpdateServiceCategoryHandler', () => {
  it('renames category', async () => {
    const repo = mockRepo();
    const category = existingCategory();
    repo.findById.mockResolvedValue(category);

    const handler = new UpdateServiceCategoryHandler(repo);
    const categoryId = ServiceCategoryId.from(CATEGORY_ID);

    await handler.execute(new UpdateServiceCategoryCommand(categoryId, 'Химчистка'));

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(category.toSnapshot().name).toBe('Химчистка');
  });

  it('updates display order', async () => {
    const repo = mockRepo();
    const category = existingCategory();
    repo.findById.mockResolvedValue(category);

    const handler = new UpdateServiceCategoryHandler(repo);
    const categoryId = ServiceCategoryId.from(CATEGORY_ID);

    await handler.execute(new UpdateServiceCategoryCommand(categoryId, undefined, undefined, 5));

    expect(category.toSnapshot().displayOrder).toBe(5);
  });

  it('updates icon', async () => {
    const repo = mockRepo();
    const category = existingCategory();
    repo.findById.mockResolvedValue(category);

    const handler = new UpdateServiceCategoryHandler(repo);
    const categoryId = ServiceCategoryId.from(CATEGORY_ID);

    await handler.execute(new UpdateServiceCategoryCommand(categoryId, undefined, 'new-icon'));

    expect(category.toSnapshot().icon).toBe('new-icon');
  });

  it('throws ServiceCategoryNotFoundError when not found', async () => {
    const repo = mockRepo();
    const handler = new UpdateServiceCategoryHandler(repo);
    const categoryId = ServiceCategoryId.from(CATEGORY_ID);

    await expect(
      handler.execute(new UpdateServiceCategoryCommand(categoryId, 'New')),
    ).rejects.toThrow(ServiceCategoryNotFoundError);
  });
});

describe('DeactivateServiceCategoryHandler', () => {
  it('deactivates category', async () => {
    const repo = mockRepo();
    const category = existingCategory();
    repo.findById.mockResolvedValue(category);

    const handler = new DeactivateServiceCategoryHandler(repo, mockClock());
    const categoryId = ServiceCategoryId.from(CATEGORY_ID);

    await handler.execute(new DeactivateServiceCategoryCommand(categoryId));

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(category.toSnapshot().isActive).toBe(false);
  });

  it('throws ServiceCategoryNotFoundError when not found', async () => {
    const repo = mockRepo();
    const handler = new DeactivateServiceCategoryHandler(repo, mockClock());
    const categoryId = ServiceCategoryId.from(CATEGORY_ID);

    await expect(handler.execute(new DeactivateServiceCategoryCommand(categoryId))).rejects.toThrow(
      ServiceCategoryNotFoundError,
    );
  });
});

describe('ListServiceCategoriesHandler', () => {
  it('returns empty list', async () => {
    const repo = mockRepo();
    const handler = new ListServiceCategoriesHandler(repo);

    const result = await handler.execute(new ListServiceCategoriesQuery());

    expect(result).toEqual([]);
    expect(repo.findAll).toHaveBeenCalledWith(false);
  });

  it('returns mapped DTOs', async () => {
    const repo = mockRepo();
    const cat = existingCategory();
    repo.findAll.mockResolvedValue([cat]);

    const handler = new ListServiceCategoriesHandler(repo);
    const result = await handler.execute(new ListServiceCategoriesQuery());

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      displayOrder: 1,
      icon: 'icon',
      id: CATEGORY_ID,
      isActive: true,
      name: 'Полировка',
    });
  });

  it('passes includeInactive to repo', async () => {
    const repo = mockRepo();
    const handler = new ListServiceCategoriesHandler(repo);

    await handler.execute(new ListServiceCategoriesQuery(true));

    expect(repo.findAll).toHaveBeenCalledWith(true);
  });
});
