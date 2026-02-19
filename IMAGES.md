# Images des Champions

## 📸 Source des images

Les images des champions proviennent du CDN **Mobalytics**, qui héberge les icônes officielles de League of Legends.

**CDN URL**: `https://cdn.mobalytics.gg/assets/lol/images/dd/champions/icons/`

## 🎨 Images dans la base de données

Chaque champion dans la table `champions` possède une colonne `image_url` qui contient l'URL complète de son icône.

### Exemple
```sql
SELECT id, name, image_url FROM champions WHERE name = 'Ahri';
```

Résultat:
```
id   | name | image_url
-----|------|----------
Ahri | Ahri | https://cdn.mobalytics.gg/assets/lol/images/dd/champions/icons/ahri.png
```

## 🔧 Mise à jour des images

Pour mettre à jour les images de tous les champions, exécutez le script:

```bash
node update-champion-splash.js
```

Ce script:
1. Récupère tous les champions de la base de données
2. Génère l'URL de l'image pour chaque champion depuis le CDN Mobalytics
3. Met à jour la colonne `image_url` dans la table `champions`

### Mapping des noms spéciaux

Certains champions ont des noms qui nécessitent une transformation pour correspondre aux IDs du CDN:

| Nom dans la DB | ID de l'image |
|----------------|---------------|
| Wukong | monkeyking |
| Cho'Gath | chogath |
| Kai'Sa | kaisa |
| Kha'Zix | khazix |
| Kog'Maw | kogmaw |
| LeBlanc | leblanc |
| Lee Sin | leesin |
| Master Yi | masteryi |
| Miss Fortune | missfortune |
| Nunu & Willump | nunu |
| Rek'Sai | reksai |
| Renata Glasc | renata |
| Tahm Kench | tahmkench |
| Twisted Fate | twistedfate |
| Vel'Koz | velkoz |
| Dr. Mundo | drmundo |
| Jarvan IV | jarvaniv |
| Xin Zhao | xinzhao |

## 📱 Affichage dans le jeu

Les images s'affichent automatiquement dans:
- **Recherche de champions**: Suggestions avec image à côté du nom
- **Historique des tentatives**: Chaque champion deviné apparaît avec son icône

### Code frontend

Dans `app.js`:

```javascript
// Suggestions de recherche
function displaySuggestions(filtered) {
    suggestionsDiv.innerHTML = filtered.map(champ => `
        <div class="suggestion-item">
            <img src="${champ.imageUrl}" 
                 style="width: 35px; height: 35px; border-radius: 4px;">
            <span>${champ.name}</span>
        </div>
    `).join('');
}

// Ligne de tentative
function createGuessRow(guess) {
    const imageUrl = guess.champion?.imageUrl || fallbackUrl;
    row.innerHTML = `
        <div class="guess-cell">
            <img src="${imageUrl}" 
                 style="width: 30px; height: 30px; border-radius: 4px;">
            <span>${comp.name}</span>
        </div>
        ...
    `;
}
```

## 🔍 Fallback

Si une image n'est pas disponible dans la DB, le frontend utilise un fallback:

```javascript
const fallbackUrl = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${championId}.png`;
```

## ✨ Résultats

**170 champions** ont été mis à jour avec succès avec leurs images depuis le CDN Mobalytics.

Les images s'affichent maintenant automatiquement dans toutes les interfaces du jeu ! 🎮
