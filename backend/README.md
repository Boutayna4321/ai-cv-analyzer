# AI CV Analyzer — Backend (setup rapide)

Ce fichier décrit comment démarrer le backend en local et utilitaires fournis.

Prérequis
- Node.js >=18
- npm
- Une base MongoDB (Atlas, Docker ou install local)

1) Installer les dépendances

```powershell
cd backend
npm install
```

2) Configuration
- Crée un fichier `backend/.env` basé sur `backend/.env.example` et remplis les valeurs (ne commite pas ce fichier).

Variables importantes à renseigner :
- `MONGODB_URI` (ex: mongodb+srv://user:pass@cluster0.mongodb.net/ai-cv-analyzer)
- `JWT_SECRET`
- `OPENAI_API_KEY` (optionnel pour dev)
- `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` (optionnel)
- `FRONTEND_URL` (ex: http://localhost:3000)

3) Scripts utiles

- Lancer en dev (nodemon) :
```powershell
npm run dev
```

- Lancer le worker d'analyse (dans un terminal séparé) :
```powershell
npm run worker
```

- Créer un utilisateur de test/admin (utilise `SEED_ADMIN_*` vars si présentes) :
```powershell
npm run seed
```

- Créer les indexs recommandés dans la DB :
```powershell
npm run create-indexes
```

- Vérifier la connexion et lister les collections :
```powershell
node scripts/checkConnection.js
```

4) Endpoints importants
- `POST /api/auth/register` — création utilisateur
- `POST /api/auth/login` — login
- `GET /api/auth/me` — profil (requires Bearer token)
- `POST /api/cv/upload` — upload & analyse (protected, retourne 202 + analysisId, traitement async)
- `GET /api/cv/history` — historique (protected)
- `POST /api/payment/create-session` — créer session Stripe (protected)
- `POST /api/payment/webhook` — webhook Stripe (public, raw body)

5) Queue asynchrone (Redis + BullMQ)

Par défaut, les analyses sont traitées **asynchronement** via une queue Redis. Cela signifie :
- L'upload retourne immédiatement (code 202) avec `analysisId` et statut `processing`.
- Un worker traite l'analyse en arrière-plan (`backend/workers/analysisWorker.js`).
- L'utilisateur peut voir le statut via `/api/cv/analyze/:id` ou `/api/cv/history`.

Pour que cela fonctionne, tu dois avoir Redis lancé. Options :

**Option A : Redis en Docker (recommandé)**
```powershell
docker-compose up -d redis
```

Puis dans `backend/.env` :
```
REDIS_URL=redis://localhost:6379
```

**Option B : Redis installé localement**
Installer Redis et lancer `redis-server`, puis `REDIS_URL=redis://localhost:6379` dans `.env`.

Après avoir démarré Redis, lancer le worker dans un **terminal séparé** :
```powershell
npm run worker
```

Cela affichera : `[Worker] Analysis worker started, listening for jobs...`

Par défaut, les fichiers sont stockés localement dans `backend/uploads`. Pour utiliser S3-compatible (MinIO, Backblaze B2, etc.):

**Option A : MinIO en local (Docker, gratuit)**

Démarrer MinIO via Docker :
```powershell
docker run -d --name minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio server /data --console-address ":9001"
```

Puis dans `backend/.env`, ajouter :
```
S3_BUCKET=ai-cv-analyzer
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```

L'interface MinIO accessible à `http://localhost:9001`.

**Option B : Amazon S3 (free tier AWS, limité)**

Créer un bucket S3 et un IAM user, puis remplir `backend/.env` avec les credentials AWS.

**Option C : Backblaze B2 (gratuit, coûts bas)**

Créer un bucket B2, générer API key, et configurer dans `.env` (B2 expose une API S3-compatible).

Si `S3_BUCKET` vide, les fichiers resteront en local (`backend/uploads`).

6) Notes
- Pour rendre les jobs d'analyse asynchrones, ajoutez une queue (Redis + Bull) et un worker qui consomme `analyzeCV`.
- En production, configurer lifecycle rules pour supprimer les CV après X jours (RGPD / conformité).
