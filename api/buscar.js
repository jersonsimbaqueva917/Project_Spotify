const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (!admin.apps.length) {
  try {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    const serviceAccount = JSON.parse(serviceAccountRaw);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
    });
  } catch (e) {
    console.error("ERROR DE INICIALIZACIÓN:", e.message);
  }
}

const db = getFirestore('spotify100');

export default async function handler(req, res) {
  const { termino } = req.query;

  // Si no hay término, no buscamos nada
  if (!termino) {
    return res.status(200).json([]);
  }

  try {
    const songsRef = db.collection('top_songs');
    let resultados = [];

    // Intento 1: Si es un número, buscamos por Rank (Coincidencia exacta)
    if (!isNaN(termino)) {
      const doc = await songsRef.doc(termino.toString()).get();
      if (doc.exists) {
        resultados.push(doc.data());
      }
    } else {
      // Intento 2: Si es texto, buscamos sugerencias por Artista (Empieza con...)
      // IMPORTANTE: Para que esto funcione, el nombre en la base de datos
      // debe coincidir en mayúsculas/minúsculas.
      const snapshot = await songsRef
        .where('artist', '>=', termino)
        .where('artist', '<=', termino + '\uf8ff')
        .limit(10) // Limitamos a 10 sugerencias para mayor velocidad
        .get();

      snapshot.forEach(d => resultados.push(d.data()));
    }

    res.status(200).json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message, code: error.code });
  }
}