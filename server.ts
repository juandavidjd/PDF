import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';

// 1. FORZAR CARGA DE .ENV (Ruta absoluta segura)
const envPath = path.resolve(process.cwd(), '.env');
console.log(`🔌 Cargando configuración desde: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.warn("⚠️  ADVERTENCIA: No se pudo leer el archivo .env");
    console.warn("    Asegúrate de que está en C:\\adsiweb\\.env");
} else {
    console.log("✅ Configuración cargada correctamente.");
}

// 2. IMPORTAR MÓDULOS (Después de cargar las variables)
import apiFitmentV11 from './api_fitment_v11';
import apiShopifyV11 from './api_shopify_v11';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

// 📸 MEDIA BRIDGE
const MEDIA_PATH = path.join(process.cwd(), '..', 'IND_MOTOS', 'Imagenes');
app.use('/media', express.static(MEDIA_PATH));
console.log(`📸 Media Bridge montado en: /media`);

// 🔌 RUTAS API
app.use('/api/v11/fitment', apiFitmentV11);
app.use('/api/v11/shopify', apiShopifyV11);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`\n🟢 ODI KERNEL V11.4 ONLINE - Puerto ${PORT}`);
    console.log(`=============================================`);
    // Verificar que las variables existen en memoria
    console.log(`   🛒 Tienda: ${process.env.SHOPIFY_SHOP_NAME || 'NO DETECTADA'}`);
    console.log(`   🔑 Token:  ${process.env.SHOPIFY_ACCESS_TOKEN ? 'DETECTADO (Oculto)' : 'NO DETECTADO'}`);
    console.log(`=============================================`);
});