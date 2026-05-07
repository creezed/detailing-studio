import { EntityManager } from '@mikro-orm/postgresql';
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { from, lastValueFrom, type Observable } from 'rxjs';

@Injectable()
export class TransactionalInterceptor implements NestInterceptor {
  constructor(private readonly em: EntityManager) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest<{ method: string }>();

      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return next.handle();
      }
    }

    return from(
      this.em.transactional(() => lastValueFrom(next.handle(), { defaultValue: undefined })),
    );
  }
}
