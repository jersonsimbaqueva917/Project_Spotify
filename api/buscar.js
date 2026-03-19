const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Evitamos inicializaciones duplicadas
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        projectId: process.env.FIREBASE_PROJECT_ID
    });
}

const db = getFirestore('(default)');

export default async function handler(req, res) {
    const { termino } = req.query; // Lo que el usuario escribe en el input
    
    if (!termino) {
        return res.status(400).json({ error: "Falta el término de búsqueda" });
    }

    try {
        const songsRef = db.collection('top_songs');
        let resultados = [];

        // 1. Intentamos buscar por ID (alltime_rank)
        const doc = await songsRef.doc(termino.toString()).get();
        
        if (doc.exists) {
            resultados.push(doc.data());
        } else {
            // 2. Si no es ID, buscamos por columna secundaria (Artista)
            // Nota: El artista debe coincidir exactamente (Mayúsculas/Minúsculas)
            const snapshot = await songsRef.where('artist', '==', termino).get();
            snapshot.forEach(d => resultados.push(d.data()));
        }

        res.status(200).json(resultados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}