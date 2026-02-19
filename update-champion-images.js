require('dotenv').config();
const pool = require('./db');
const championData = require('./champion.json');

async function updateChampionImages() {
  const champions = Object.values(championData.data);
  
  console.log(`\nMise à jour de ${champions.length} images de champions...`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const champ of champions) {
    const cdnImageUrl = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${champ.image.full}`;
    
    try {
      const result = await pool.query(
        'UPDATE champions SET image_url = $1 WHERE id = $2',
        [cdnImageUrl, champ.id]
      );
      
      if (result.rowCount > 0) {
        updated++;
        console.log(`✓ ${champ.id}: ${champ.image.full}`);
      } else {
        notFound++;
        console.log(`✗ ${champ.id} non trouvé dans la DB`);
      }
    } catch (error) {
      console.error(`✗ Erreur pour ${champ.id}:`, error.message);
    }
  }
  
  console.log(`\n✅ Terminé: ${updated} mis à jour, ${notFound} non trouvés`);
  process.exit(0);
}

updateChampionImages().catch(err => {
  console.error('Échec:', err);
  process.exit(1);
});
