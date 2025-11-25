// backend/utils/openai.js
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

const openaiKey = process.env.OPENAI_API_KEY;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

/**
 * Extraire le texte d'un PDF
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Erreur extraction PDF:', error);
    throw new Error('Impossible d\'extraire le texte du PDF');
  }
}

/**
 * Analyser le CV avec OpenAI
 */
async function analyzeCV(cvText) {
  try {
    const prompt = `Tu es un expert en recrutement et en optimisation de CV. Analyse le CV suivant et fournis une évaluation complète.

CV:
${cvText}

Fournis ton analyse au format JSON avec cette structure EXACTE:
{
  "score": <nombre entre 0 et 100>,
  "strengths": [<liste de 3-5 points forts>],
  "weaknesses": [<liste de 3-5 points faibles>],
  "missingSkills": [<compétences importantes manquantes>],
  "improvements": [
    {
      "category": "<catégorie: Format/Contenu/Compétences/etc>",
      "suggestion": "<suggestion détaillée>"
    }
  ],
  "extractedData": {
    "name": "<nom si trouvé>",
    "email": "<email si trouvé>",
    "phone": "<téléphone si trouvé>",
    "skills": [<liste des compétences>],
    "experience": [<expériences professionnelles>],
    "education": [<formations>]
  },
  "atsCompatible": <true/false>
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    if (!openai) {
      return {
        score: 70,
        strengths: ['Structure claire', 'Expérience pertinente'],
        weaknesses: ['Peu de métriques chiffrées', 'Pas de section compétences'],
        missingSkills: ['Leadership', 'Gestion de projet'],
        improvements: [
          { category: 'Format', suggestion: 'Ajouter une section compétences clés' }
        ],
        extractedData: {
          name: 'Candidat Exemple',
          email: 'candidate@example.com',
          phone: '+212600000000',
          skills: ['React', 'Node.js'],
          experience: ['Développeur Fullstack - 3 ans'],
          education: ['Master Informatique']
        },
        atsCompatible: true
      };
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant expert en analyse de CV. Tu réponds toujours en JSON valide.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content.trim();
    
    // Nettoyer le JSON (enlever les backticks markdown si présents)
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    return JSON.parse(cleanedContent);
  } catch (error) {
    console.error('Erreur analyse OpenAI:', error);
    throw new Error('Erreur lors de l\'analyse du CV avec l\'IA');
  }
}

/**
 * Générer une version optimisée du CV
 */
async function generateOptimizedCV(cvText, analysisResult) {
  try {
    const prompt = `Tu es un expert en rédaction de CV. Basé sur ce CV et son analyse, génère une version AMÉLIORÉE et optimisée pour les ATS.

CV ORIGINAL:
${cvText}

ANALYSE:
- Score actuel: ${analysisResult.score}/100
- Points faibles: ${analysisResult.weaknesses.join(', ')}
- Compétences manquantes: ${analysisResult.missingSkills.join(', ')}

INSTRUCTIONS:
1. Garde toutes les informations vraies du CV original
2. Améliore la structure et le format pour être compatible ATS
3. Optimise les mots-clés et les compétences
4. Rends le CV plus impactant et professionnel
5. Format Markdown simple et clair

Génère le CV optimisé:`;

    if (!openai) {
      return `# CV Optimisé

## Expérience Professionnelle
- Développeur Fullstack | Exemple Corp
  - Livré des fonctionnalités React et Node.js

## Compétences
- React, Node.js, Express, MongoDB

## Formation
- Master Informatique`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en rédaction de CV professionnels.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2500
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erreur génération CV optimisé:', error);
    throw new Error('Erreur lors de la génération du CV optimisé');
  }
}

module.exports = {
  extractTextFromPDF,
  analyzeCV,
  generateOptimizedCV
};