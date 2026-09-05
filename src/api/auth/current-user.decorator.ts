import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * `AuthGuard()` (JwtStrategy.validate) `req.user` ga yozgan foydalanuvchini beradi.
 *
 *   @CurrentUser() user: User        — butun obyekt
 *   @CurrentUser('id') userId: string — bitta maydon
 *
 * Faqat `@UseGuards(AuthGuard())` ostidagi handler'larda ishlating.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as User | undefined;
    return field ? user?.[field] : user;
  },
);
