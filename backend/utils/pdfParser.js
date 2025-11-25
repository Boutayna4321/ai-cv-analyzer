// utils/pdfParser.js
import pdf from 'pdf-parse';

export const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdf(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('Le PDF semble être vide ou ne contient pas de texte extractible');
    }

    // Nettoyer le texte
    let cleanedText = data.text
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
      .replace(/\n{3,}/g, '\n\n') // Limiter les sauts de ligne
      .trim();

    return cleanedText;
  } catch (error) {
    console.error('Erreur extraction PDF:', error);
    throw new Error('Impossible d\'extraire le texte du PDF : ' + error.message);
  }
};