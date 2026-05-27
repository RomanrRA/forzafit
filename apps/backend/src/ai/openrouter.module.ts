import { Module, Global } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';

@Global()
@Module({
  providers: [OpenRouterService],
  exports: [OpenRouterService],
})
export class OpenRouterModule {}
