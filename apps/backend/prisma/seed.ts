import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Nettoyage pour éviter les doublons lors des re-run
  await prisma.card.deleteMany({});

  console.log('🌱 Seeding Cards...');

  await prisma.card.createMany({
    data: [
      {
        id: 'space_bro_001',
        name: 'Soldat Bleu Basique',
        rarity: 'common',
        setId: 'album_space_bros',
        imageUrl: 'https://placehold.co/512x512/0000FF/FFFFFF.png?text=Space+Bro',
      },
      {
        id: 'necro_bot_005',
        name: 'Robot qui fait la sieste',
        rarity: 'rare',
        setId: 'album_necro_bots',
        imageUrl: 'https://placehold.co/512x512/00FF00/000000.png?text=Necro+Bot',
      },
      {
        id: 'empire_papi_001',
        name: 'Papi sur le Trône',
        rarity: 'legendary',
        setId: 'album_empire',
        imageUrl: 'https://placehold.co/512x512/FFD700/000000.png?text=Golden+Papi',
      },
    ],
    skipDuplicates: true,
  });

  console.log('👤 Seeding Test User...');

  // On utilise upsert pour ne pas planter si on relance le seed 10 fois
  await prisma.user.upsert({
    where: { deviceId: 'device-test-001' },
    update: {}, // Si existe déjà, on ne touche à rien
    create: {
      id: 'user-test-id-123', // <--- ID FIXE POUR TES CURLS
      deviceId: 'device-test-001',
      username: 'Jamboom_Test',
      scrapBalance: 500, // On lui donne un peu d'argent de poche
      packsSinceLastLegendary: 14, // Pity Timer presque plein (pour tester le drop !)
    },
  });

  console.log('✅ Seeding terminé !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
