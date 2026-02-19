const fs = require('fs');
const https = require('https');
const path = require('path');

const championData = require('./champion.json');
const champions = Object.values(championData.data);

const IMAGES_DIR = path.join(__dirname, 'public', 'images', 'champions');
const CDN_BASE = 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/';

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function downloadImage(championId, filename) {
  return new Promise((resolve, reject) => {
    const url = `${CDN_BASE}${filename}`;
    const filePath = path.join(IMAGES_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${filename} already exists`);
      resolve();
      return;
    }
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function downloadAllChampions() {
  console.log(`Downloading ${champions.length} champion images...`);
  
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < champions.length; i += BATCH_SIZE) {
    const batch = champions.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(champ => 
        downloadImage(champ.id, champ.image.full).catch(err => 
          console.error(`✗ Error downloading ${champ.id}:`, err.message)
        )
      )
    );
    console.log(`Progress: ${Math.min(i + BATCH_SIZE, champions.length)}/${champions.length}`);
  }
  
  console.log('\n✅ All champion images downloaded!');
}

downloadAllChampions().catch(console.error);
