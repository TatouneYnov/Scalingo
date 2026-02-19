# Instructions de déploiement

## Mise à jour des images des champions sur Scalingo

Après avoir déployé la nouvelle version, exécutez le script pour ajouter les URLs d'images des champions dans la base de données :

```bash
# Via scalingo run
~/.local/bin/scalingo -a loldlahess --region osc-fr1 run node update-champion-images.js
```

Ou via le tunnel de base de données :

```bash
# Terminal 1 : Ouvrir le tunnel
~/.local/bin/scalingo -a loldlahess --region osc-fr1 db-tunnel -i ~/.ssh/id_ed25519 -p 10001 DATABASE_URL

# Terminal 2 : Exécuter le script
node update-champion-images.js
```

## Déploiement complet

```bash
# 1. Commit les changements
git add .
git commit -m "feat: description des changements"

# 2. Pousser sur Scalingo
git push scalingo devv2:main

# 3. Mettre à jour les images (une seule fois)
~/.local/bin/scalingo -a loldlahess --region osc-fr1 run node update-champion-images.js
```

## Notes

- Les images sont hébergées sur le CDN de League of Legends
- Le script `update-champion-images.js` lit `champion.json` et met à jour la colonne `image_url` dans la table `champions`
- 170 champions ont des images disponibles
- Les images locales dans `public/images/champions/` sont ignorées par git (optionnel pour le cache local)
