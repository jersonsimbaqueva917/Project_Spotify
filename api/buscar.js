const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  // CORRECCIÓN PARA LA LLAVE PRIVADA:
  // Vercel a veces rompe los saltos de línea (\n) del JSON. Esto los arregla:
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = getFirestore('spotify100');

export default async function handler(req, res) {
  const { termino } = req.query;
  try {
    // Intentar buscar por Rank (Número)
    let snapshot = await db.collection('top_songs')
                           .where('alltime_rank', '==', parseInt(termino))
                           .get();

    // Si no hay resultados, intentar por Artista (Texto)
    if (snapshot.empty) {
      snapshot = await db.collection('top_songs')
                         .where('artist', '==', termino)
                         .get();
    }

    const resultados = [];
    snapshot.forEach(doc => resultados.push(doc.data()));
    
    res.status(200).json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}