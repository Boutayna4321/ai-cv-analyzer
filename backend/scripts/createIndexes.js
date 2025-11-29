require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Analysis = require('../models/Analysis');
const Payment = require('../models/Payment');

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI manquant dans .env. Configurez votre fichier .env dans ./backend');
      process.exit(1);
    }

    await connectDB();

    // Créer indexs recommandés
    console.log('Création des indexs...');

    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log('Index unique créé: users.email');

    await Analysis.collection.createIndex({ userId: 1, createdAt: -1 });
    console.log('Index créé: analyses { userId: 1, createdAt: -1 }');

    await Payment.collection.createIndex({ stripeSessionId: 1 });
    await Payment.collection.createIndex({ stripeCustomerId: 1 });
    console.log('Indexs créés: payments stripeSessionId, stripeCustomerId');

    console.log('Tous les indexs ont été créés avec succès.');
    process.exit(0);
  } catch (err) {
    console.error('Erreur createIndexes:', err);
    process.exit(1);
  }
};

run();
