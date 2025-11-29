# Prochaines étapes recommandées — backend

Ce document liste des améliorations prioritaires pour rendre le backend prêt pour la production, avec actions concrètes et commandes d'installation.

1) Variables d'environnement
  - Ajouter (ou conserver) un fichier `./backend/.env` pour le développement local.
  - Fournir un `./backend/.env.example` (optionnel) contenant uniquement les clés nommées — ne jamais committer de secrets.

Exemple minimal `.env.example`:

```
# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-cv-analyzer

# JWT
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Frontend
FRONTEND_URL=http://localhost:3000

# Limits
MAX_FILE_SIZE=5242880
```

2) Stockage des fichiers (uploads)
  - Problème actuel: stockage local (`/backend/uploads`) — pas fiable en production (scalabilité et sécurité).
  - Solution recommandée: basculer vers un bucket S3 (ou équivalent) et stocker l'URL dans `Analysis.fileUrl`.
  - Actions concrètes:
    - Ajouter SDK AWS (`npm install aws-sdk` ou `npm install @aws-sdk/client-s3` pour v3).
    - Modifier `middleware/upload.js` pour envoyer le fichier vers S3 (ou ajouter un middleware post-upload qui upload puis supprime le fichier local).
    - Ajouter variables d'env: `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.

3) Traitement asynchrone des analyses (recommandé)
  - Problème actuel: analyse synchrone dans la requête HTTP — risque de timeout et mauvaise UX.
  - Solution recommandée: utiliser une file (Redis + BullMQ) et un worker dédié qui consomme les jobs d'analyse.
  - Avantages: retry, métriques, séparation web/worker, scalabilité et meilleure gestion des coûts des appels OpenAI.
  - Actions concrètes:
    - Installer Redis et BullMQ: `npm install bullmq ioredis`
    - Créer un worker `backend/workers/analysisWorker.js` qui:
      - télécharge le fichier (depuis S3 ou path local),
      - exécute `analyzeCV`, génère `optimizedVersion` si demandé,
      - met à jour le document `Analysis` et notifie l'utilisateur si nécessaire.
    - Dans `cvController.uploadAndAnalyze`, créer le job (push dans la queue) et retourner immédiatement un `analysisId` et statut `processing`.

4) Sécurité & robustesse
  - Ajouter validation côté frontend (meilleure UX) en miroir des validations backend.
  - Ajouter l'usage de `express-rate-limit` par route / IP plus fin si nécessaire.
  - Ajouter logging structuré (p. ex. `winston`) et monitoring (Sentry) pour capturer erreurs runtime.

5) Tests & CI
  - Créer tests unitaires basiques pour `authController` et `cvController` (moqueries de DB/OpenAI).
  - Ajouter pipeline GitHub Actions pour linter, tests et build.

6) Commandes d'installation utiles (PowerShell)

```powershell
cd backend
npm install ioredis bullmq @aws-sdk/client-s3 winston express-validator
# puis dans le frontend si ajout de validation
cd ..\frontend
npm install
```

7) Plan d'implémentation priorisé (itérations)
  - Itération 1 (2-4 jours): Ajouter `.env.example`, logging, validation frontend minimale, créer README et tests basiques.
  - Itération 2 (3-5 jours): Intégration S3 et migration des uploads.
  - Itération 3 (3-6 jours): Mise en place de Redis + BullMQ, worker d'analyse asynchrone.
  - Itération 4 (2 jours): CI/CD (tests + build + scan vulnérabilités) et préparation Docker.

Si tu veux, je peux générer dès maintenant les fichiers de base pour l'itération 1 ( `.env.example`, `backend/README.md` ) et un squelette de `analysisWorker.js`.