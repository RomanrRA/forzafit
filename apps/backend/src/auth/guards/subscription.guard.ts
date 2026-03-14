import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUBSCRIPTION_KEY } from '../decorators/subscription.decorator';

export type SubscriptionTier =
  | 'free'
  | 'premium_workout'
  | 'premium_nutrition'
  | 'premium_full';

const tierRank: Record<SubscriptionTier, number> = {
  free: 0,
  premium_workout: 1,
  premium_nutrition: 1,
  premium_full: 2,
};

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<SubscriptionTier>(
      SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    const userTier: SubscriptionTier = user?.subscriptionTier ?? 'free';

    if (required === userTier || userTier === 'premium_full') return true;
    if (
      required === 'premium_workout' &&
      userTier === 'premium_workout'
    )
      return true;
    if (
      required === 'premium_nutrition' &&
      userTier === 'premium_nutrition'
    )
      return true;

    throw new ForbiddenException(
      `Требуется подписка: ${required}`,
    );
  }
}
