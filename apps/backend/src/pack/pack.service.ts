import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Assure-toi que ce path est bon, sinon '../prisma.service' selon ta structure
import { Card, User } from '@prisma/client';

@Injectable()
export class PackService {
  // On injecte Prisma pour parler à la BDD
  constructor(private prisma: PrismaService) {}

  async openPack(userId: string) {
    // 1. Récupérer l'utilisateur
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // 2. Déterminer la rareté Slot 4
    const isPityTriggered = user.packsSinceLastLegendary >= 15;
    const slot4Rarity = this.determineSlot4Rarity(isPityTriggered);

    // 3. Tirage des cartes
    const allCards = await this.prisma.card.findMany();
    const cardsToGive: Card[] = [];
    cardsToGive.push(this.drawRandomCard(allCards, 'common'));
    cardsToGive.push(this.drawRandomCard(allCards, 'common'));
    cardsToGive.push(this.drawRandomCard(allCards, 'common'));
    cardsToGive.push(this.drawRandomCard(allCards, slot4Rarity));

    // 4. Traitement (Optimisé avec un Set)
    // On charge TOUTE la collection de l'user d'un coup (plus performant)
    const ownedCollection = await this.prisma.userCollection.findMany({
      where: { userId: user.id },
      select: { cardId: true },
    });

    // On crée un Set pour vérifier instantanément si on a la carte
    const ownedCardIds = new Set(ownedCollection.map((c) => c.cardId));

    const results: { card: Card; isNew: boolean; scrapEarned: number }[] = [];
    let totalScrapEarned = 0;
    let hasLegendary = false;

    for (const card of cardsToGive) {
      if (card.rarity === 'legendary') hasLegendary = true;

      let isNew = false;
      let scrap = 0;

      // Vérification dans notre Set local (qui se met à jour en temps réel !)
      if (ownedCardIds.has(card.id)) {
        // C'est un doublon (soit ancien, soit pioché il y a 2 secondes dans ce pack)
        scrap = this.getScrapValue(card.rarity);
        totalScrapEarned += scrap;
      } else {
        // C'est nouveau !
        isNew = true;
        // IMPORTANT : On l'ajoute au Set immédiatement.
        // Si la même carte retombe au slot suivant, elle sera vue comme "possédée".
        ownedCardIds.add(card.id);
      }

      results.push({ card, isNew, scrapEarned: scrap });
    }

    // 5. Transaction BDD
    await this.prisma.$transaction(async (tx) => {
      // A. Update User
      await tx.user.update({
        where: { id: user.id },
        data: {
          scrapBalance: { increment: totalScrapEarned },
          packsSinceLastLegendary: hasLegendary ? 0 : { increment: 1 },
        },
      });

      // B. Insert des nouvelles cartes uniquement
      for (const res of results) {
        if (res.isNew) {
          await tx.userCollection.create({
            data: { userId: user.id, cardId: res.card.id },
          });
        }
      }
    });

    return {
      packContent: results,
      userUpdate: {
        newScrapBalance: user.scrapBalance + totalScrapEarned,
        pityTimerReset: hasLegendary,
      },
    };
  }

  // --- HELPERS ---

  private determineSlot4Rarity(forceLegendary: boolean): string {
    if (forceLegendary) return 'legendary';

    const rand = Math.random() * 100;
    if (rand < 10) return 'legendary'; // 10%
    if (rand < 60) return 'rare';      // 50% (10+50=60)
    return 'common';                   // 40% Reste
  }

  private drawRandomCard(allCards: Card[], targetRarity: string): Card {
    const pool = allCards.filter((c) => c.rarity === targetRarity);
    if (pool.length === 0) {
        // Fallback si pas de carte de cette rareté (ex: pas de rare dans le seed)
        // On retourne n'importe quelle carte pour éviter le crash MVP
        return allCards[0]; 
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }

  private getScrapValue(rarity: string): number {
    switch (rarity) {
      case 'common': return 10;
      case 'rare': return 50;
      case 'legendary': return 200;
      default: return 0;
    }
  }
}
