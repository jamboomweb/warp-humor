import { Module } from '@nestjs/common';
import { PackController } from './pack.controller';
import { PackService } from './pack.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PackController],
  providers: [PackService]
})
export class PackModule {}
