require('dotenv').config();
const pool = require('./db');

// CDN fiable pour les images LoL
const CDN_URL = 'https://cdn.mobalytics.gg/assets/lol/images/dd/champions/icons';

async function updateChampionSplashImages() {
  try {
    console.log('🎨 Mise à jour des images des champions depuis Mobalytics CDN...\n');
    
    // Récupérer tous les champions dans la DB
    const result = await pool.query('SELECT id, name FROM champions ORDER BY name');
    const champions = result.rows;
    
    let updatedCount = 0;
    let failedCount = 0;
    
    // Créer un mapping nom champion -> id pour différents formats
    const championIdMapping = {
      'Wukong': 'monkeyking',
      'Cho\'Gath': 'chogath',
      'Kai\'Sa': 'kaisa',
      'Kha\'Zix': 'khazix',
      'Kog\'Maw': 'kogmaw',
      'LeBlanc': 'leblanc',
      'Lee Sin': 'leesin',
      'Master Yi': 'masteryi',
      'Miss Fortune': 'missfortune',
      'Nunu & Willump': 'nunu',
      'Rek\'Sai': 'reksai',
      'Renata Glasc': 'renata',
      'Tahm Kench': 'tahmkench',
      'Twisted Fate': 'twistedfate',
      'Vel\'Koz': 'velkoz',
      'Dr. Mundo': 'drmundo',
      'Jarvan IV': 'jarvaniv',
      'Xin Zhao': 'xinzhao'
    };
    
    for (const champion of champions) {
      let imageId = champion.id.toLowerCase();
      
      // Utiliser le mapping si disponible
      if (championIdMapping[champion.name]) {
        imageId = championIdMapping[champion.name];
      } else {
        // Nettoyer l'ID pour l'URL (enlever espaces, apostrophes, etc.)
        imageId = imageId.replace(/[^a-z]/g, '');
      }
      
      const imageUrl = `${CDN_URL}/${imageId}.png`;
      
      try {
        await pool.query(
          'UPDATE champions SET image_url = $1 WHERE id = $2',
          [imageUrl, champion.id]
        );
        updatedCount++;
        console.log(`✓ ${champion.name} -> ${imageId}.png`);
      } catch (err) {
        failedCount++;
        console.log(`✗ ${champion.name}: ${err.message}`);
      }
    }
    
    console.log(`\n📊 Résumé:`);
    console.log(`   ✅ ${updatedCount} champions mis à jour`);
    console.log(`   ✗ ${failedCount} échecs`);
    console.log(`\n💡 Les images proviennent de: ${CDN_URL}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

updateChampionSplashImages();
