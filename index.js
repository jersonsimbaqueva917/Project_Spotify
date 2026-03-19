const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const readline = require('readline');

const serviceAccount = require('./serviceAccountKey.json');

// IMPORTANTE: Asegúrate de que este ID sea el que aparece en tu consola de Firebase
const PROJECT_ID = serviceAccount.project_id; 

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID
});

// Forzamos la base de datos (default). 
const db = getFirestore('spotify100'); 

async function uploadData() {
    console.log(`🚀 Iniciando carga en proyecto: ${PROJECT_ID}`);
    
    try {
        const fileStream = fs.createReadStream('spotify_alltime_top100_songs.csv');
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let isFirstLine = true;
        let count = 0;

        for await (const line of rl) {
            if (isFirstLine) { isFirstLine = false; continue; } // Saltamos encabezados
            if (!line.trim()) continue;

            // Detectamos el separador automáticamente
            const separator = line.includes(';') ? ';' : ',';
            const columns = line.split(separator);

            // Limpiamos los datos
            const rank = columns[0] ? columns[0].trim() : null;
            const title = columns[1] ? columns[1].trim() : "Sin título";
            const artist = columns[2] ? columns[2].trim() : "Desconocido";

            if (!rank || isNaN(rank)) continue;

            try {
                // Guardamos en la colección 'top_songs'
                await db.collection('top_songs').doc(rank).set({
                    alltime_rank: parseInt(rank),
                    title: title,
                    artist: artist,
                    streams_billions: columns[3] || "0",
                    genre: columns[4] || "N/A",
                    updated_at: new Date().toISOString()
                });
                console.log(`✅ [${rank}] ${title} guardado.`);
                count++;
            } catch (e) {
                console.error(`❌ Error en rank ${rank}: ${e.message}`);
            }
        }
        console.log(`\n✨ ¡Listo! Se cargaron ${count} canciones con éxito.`);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO DE CONEXIÓN:");
        console.error(error.message);
        console.log("\nREVISIÓN FINAL:");
        console.log("1. Ve a Firebase Console -> Firestore Database.");
        console.log("2. Verifica que ya hiciste clic en 'Crear base de datos'.");
        console.log("3. En 'Reglas', verifica que diga: allow read, write: if true;");
    }
}

uploadData();
