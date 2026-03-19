const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
    });
}
const db = getFirestore('(default)');

export default async function handler(req, res) {
    try {
        // Traemos todos los documentos ordenados por su ranking
        const snapshot = await db.collection('top_songs').orderBy('alltime_rank', 'asc').get();
        const canciones = [];
        snapshot.forEach(doc => canciones.push(doc.data()));
        res.status(200).json(canciones);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}