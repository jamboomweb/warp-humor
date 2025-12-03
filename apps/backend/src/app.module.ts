import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PackModule } from './pack/pack.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PackModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
