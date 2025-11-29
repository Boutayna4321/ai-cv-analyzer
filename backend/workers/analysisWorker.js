require('dotenv').config();
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const connectDB = require('../config/db');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { extractTextFromPDF, analyzeCV, generateOptimizedCV } = require('../utils/openai');
const { s3Configured, uploadFileToS3 } = require('../utils/storage');
const fs = require('fs').promises;
const path = require('path');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl);

// Connecter à MongoDB au démarrage
connectDB();

const worker = new Worker(
  'analysis',
  async (job) => {
    console.log(`[Worker] Processing job ${job.id}:`, job.data);

    const { analysisId, userId, filePath, originalFileName } = job.data;

    try {
      // Récupérer l'analyse depuis DB
      const analysis = await Analysis.findById(analysisId);
      if (!analysis) {
        throw new Error(`Analysis ${analysisId} not found`);
      }

      // Extraire le texte du PDF
      const cvText = await extractTextFromPDF(filePath);
      if (!cvText || cvText.trim().length < 100) {
        analysis.status = 'failed';
        analysis.errorMessage = 'Le CV ne contient pas assez de texte exploitable';
        await analysis.save();
        throw new Error('PDF text extraction failed: not enough text');
      }

      // Analyser avec OpenAI
      const analysisResult = await analyzeCV(cvText);

      // Mettre à jour l'analyse avec les résultats
      analysis.score = analysisResult.score;
      analysis.strengths = analysisResult.strengths;
      analysis.weaknesses = analysisResult.weaknesses;
      analysis.missingSkills = analysisResult.missingSkills;
      analysis.improvements = analysisResult.improvements;
      analysis.extractedData = analysisResult.extractedData;
      analysis.atsCompatible = analysisResult.atsCompatible;
      analysis.status = 'completed';

      await analysis.save();

      // Incrémenter le compteur d'analyses de l'utilisateur
      await User.findByIdAndUpdate(userId, {
        $inc: { analysesCount: 1 }
      });

      // Uploader vers S3 si configuré
      try {
        if (s3Configured()) {
          const key = `uploads/${userId}_${Date.now()}${path.extname(originalFileName)}`;
          const s3Url = await uploadFileToS3(filePath, key);
          analysis.fileUrl = s3Url;
          await analysis.save();
          // Supprimer le fichier local après upload
          try {
            await fs.unlink(filePath);
          } catch (e) {
            console.error('[Worker] Erreur suppression local après S3:', e.message);
          }
        }
      } catch (err) {
        console.error('[Worker] Erreur upload S3 (non bloquant):', err);
      }

      console.log(`[Worker] Job ${job.id} completed successfully`);
      return { success: true, analysisId };
    } catch (error) {
      console.error(`[Worker] Job ${job.id} failed:`, error);
      // Mettre à jour l'analyse avec le statut d'erreur
      try {
        const analysis = await Analysis.findById(analysisId);
        if (analysis) {
          analysis.status = 'failed';
          analysis.errorMessage = error.message;
          await analysis.save();
        }
      } catch (err) {
        console.error('[Worker] Could not update analysis with error:', err);
      }
      throw error;
    }
  },
  {
    connection,
    concurrency: 2 // Traiter max 2 analyses en parallèle
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Worker: Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Worker: Job ${job.id} failed with:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

console.log('[Worker] Analysis worker started, listening for jobs...');
