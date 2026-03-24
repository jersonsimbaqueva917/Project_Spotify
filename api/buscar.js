const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Inicialización de Firebase
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  } catch (e) {
    console.error("Error de inicialización:", e.message);
  }
}

const db = getFirestore('spotify100');

// Función para capitalizar texto (ej: "colombia" -> "Colombia")
function capitalizar(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export default async function handler(req, res) {
  const { termino } = req.query;

  if (!termino) {
    return res.status(200).json([]);
  }

  try {
    const songsRef = db.collection('top_songs');
    let resultados = [];
    const busqueda = termino.trim();

    // --- 1. LÓGICA PARA NÚMEROS (RANK Y AÑO) ---
    if (!isNaN(busqueda)) {
      const valorNumerico = parseInt(busqueda);

      // Buscar por ID de documento (Rank exacto)
      const docRef = await songsRef.doc(busqueda).get();
      if (docRef.exists) {
        resultados.push(docRef.data());
      }

      // Buscar por campo 'year' (Debe ser tipo Number en Firestore)
      const snapAnio = await songsRef.where('year', '==', valorNumerico).get();
      snapAnio.forEach(d => {
        if (!resultados.find(r => r.alltime_rank === d.data().alltime_rank)) {
          resultados.push(d.data());
        }
      });
    }

    // --- 2. LÓGICA PARA TEXTO (ARTISTA Y PAÍS) ---
    // Generamos variantes para ignorar mayúsculas/minúsculas manualmente
    const variantes = [
      busqueda, 
      busqueda.toLowerCase(), 
      busqueda.toUpperCase(), 
      capitalizar(busqueda)
    ];
    
    // Eliminamos duplicados de las variantes
    const variantesUnicas = [...new Set(variantes)];

    for (const v of variantesUnicas) {
      // Buscar por Artista (Sugerencia "empieza con")
      const snapArt = await songsRef
        .where('artist', '>=', v)
        .where('artist', '<=', v + '\uf8ff')
        .limit(10)
        .get();
      
      snapArt.forEach(d => {
        if (!resultados.find(r => r.alltime_rank === d.data().alltime_rank)) {
          resultados.push(d.data());
        }
      });

      // Buscar por País (Sugerencia "empieza con")
      const snapPais = await songsRef
        .where('country', '>=', v)
        .where('country', '<=', v + '\uf8ff')
        .limit(10)
        .get();

      snapPais.forEach(d => {
        if (!resultados.find(r => r.alltime_rank === d.data().alltime_rank)) {
          resultados.push(d.data());
        }
      });
    }

    // Enviamos los resultados (máximo 20 para no saturar el frontend)
    res.status(200).json(resultados.slice(0, 20));

  } catch (error) {
    console.error("Error en la búsqueda:", error);
    res.status(500).json({ error: error.message });
  }
}
