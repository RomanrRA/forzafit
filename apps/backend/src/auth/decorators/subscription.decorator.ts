import { SetMetadata } from '@nestjs/common';
import { SubscriptionTier } from '../guards/subscription.guard';

export const SUBSCRIPTION_KEY = 'subscription_tier';
export const RequireSubscription = (tier: SubscriptionTier) =>
  SetMetadata(SUBSCRIPTION_KEY, tier);
