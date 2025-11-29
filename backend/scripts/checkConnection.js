require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI manquant dans .env. Configurez votre fichier .env dans ./backend');
      process.exit(1);
    }

    await connectDB();

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log('Collections existantes:');
    for (const c of collections) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`- ${c.name}: ${count} documents`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Erreur checkConnection:', err);
    process.exit(1);
  }
};

run();
