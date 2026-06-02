import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { validateEnv } from './config/env.validation';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { SyncModule } from './sync/sync.module';
import { PlanTemplatesModule } from './plan-templates/plan-templates.module';
import { BodyMeasurementsModule } from './body-measurements/body-measurements.module';
import { BodyGoalsModule } from './body-goals/body-goals.module';
import { AiModule } from './ai/ai.module';
import { OpenRouterModule } from './ai/openrouter.module';
import { GamificationModule } from './gamification/gamification.module';
import { FriendsModule } from './friends/friends.module';
import { FeedModule } from './feed/feed.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { CalendarModule } from './calendar/calendar.module';
import { QuestsModule } from './quests/quests.module';
import { WorkoutAdviceModule } from './workout-advice/workout-advice.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    OpenRouterModule,
    DbModule,
    AuthModule,
    UsersModule,
    WorkoutsModule,
    SyncModule,
    PlanTemplatesModule,
    BodyMeasurementsModule,
    BodyGoalsModule,
    AiModule,
    GamificationModule,
    FriendsModule,
    FeedModule,
    LeaderboardModule,
    CalendarModule,
    QuestsModule,
    WorkoutAdviceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
