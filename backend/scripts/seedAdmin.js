require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI manquant dans .env. Configurez votre fichier .env dans ./backend');
      process.exit(1);
    }

    await connectDB();

    const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
    const name = process.env.SEED_ADMIN_NAME || 'Admin Test';
    const password = process.env.SEED_ADMIN_PASSWORD || 'secret123';

    const existing = await User.findOne({ email }).select('+password');
    if (existing) {
      console.log(`Utilisateur existant trouvé (${email}), mise à jour du nom si besoin.`);
      existing.name = name;
      await existing.save();
      console.log('Terminé.');
      process.exit(0);
    }

    const user = await User.create({ name, email, password });
    console.log('Utilisateur seedé:', { id: user._id.toString(), email: user.email, name: user.name });
    process.exit(0);
  } catch (err) {
    console.error('Erreur seedAdmin:', err);
    process.exit(1);
  }
};

run();
