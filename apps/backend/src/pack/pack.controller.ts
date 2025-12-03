import { Controller, Post, Body } from '@nestjs/common';
import { PackService } from './pack.service';

@Controller('pack')
export class PackController {
  constructor(private readonly packService: PackService) {}

  @Post('open')
  async openPack(@Body('userId') userId: string) {
    // Pour le MVP, on passe l'ID user direct dans le body
    // En prod, on le récupérerait via le token JWT (@User)
    return this.packService.openPack(userId);
  }
}
