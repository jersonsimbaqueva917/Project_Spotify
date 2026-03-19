const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  } catch (e) { console.error("Error init:", e.message); }
}

const db = getFirestore('spotify100');

// Función auxiliar para poner la primera letra en mayúscula (ej: "colombia" -> "Colombia")
function capitalizar(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export default async function handler(req, res) {
  const { termino } = req.query;
  if (!termino) return res.status(200).json([]);

  try {
    const songsRef = db.collection('top_songs');
    let resultados = [];
    
    // Normalizamos el término: "uSa" -> "USA" o "the weeknd" -> "The Weeknd"
    const terminoOriginal = termino.trim();
    const terminoMayuscula = terminoOriginal.toUpperCase();
    const terminoCapitalizado = capitalizar(terminoOriginal);

    // 1. Si es número (Rank o Año), lo manejamos igual
    if (!isNaN(terminoOriginal)) {
      const num = terminoOriginal;
      const resRank = await songsRef.doc(num).get();
      if (resRank.exists) resultados.push(resRank.data());

      const resAnio = await songsRef.where('year', '==', parseInt(num)).get();
      resAnio.forEach(d => {
        if (!resultados.find(r => r.alltime_rank === d.data().alltime_rank)) {
          resultados.push(d.data());
        }
      });
    }

    // 2. Búsqueda Multi-Formato (Artista y País)
    // Creamos una lista de variantes para buscar
    const variantes = [terminoOriginal, terminoMayuscula, terminoCapitalizado];
    
    // Eliminamos duplicados de las variantes para no hacer peticiones de más
    const variantesUnicas = [...new Set(variantes)];

    for (const v of variantesUnicas) {
      // Buscar por Artista
      const snapArt = await songsRef.where('artist', '>=', v).where('artist', '<=', v + '\uf8ff').limit(5).get();
      snapArt.forEach(d => {
        if (!resultados.find(r => r.alltime_rank === d.data().alltime_rank)) {
          resultados.push(d.data());
        }
      });

      // Buscar por País
      const snapPais = await songsRef.where('country', '>=', v).where('country', '<=', v + '\uf8ff').limit(5).get();
      snapPais.forEach(d => {
        if (!resultados.find(r => r.alltime_rank === d.data().alltime_rank)) {
          resultados.push(d.data());
        }
      });
    }

    res.status(200).json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}