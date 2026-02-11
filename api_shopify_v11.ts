import { Router } from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const router = Router();

// --- HELPERS ---
function normalizeShopDomain(shop?: string) {
    if (!shop) return "";
    const s = shop.trim();
    return s.includes(".myshopify.com") ? s : `${s}.myshopify.com`;
}

function findClientFolder(basePath: string, clientName: string): string | null {
    if (!fs.existsSync(basePath)) return null;
    const contents = fs.readdirSync(basePath);
    const match = contents.find(dir => dir.toLowerCase() === clientName.toLowerCase());
    return match ? path.join(basePath, match) : null;
}

function findImageSmart(clientFolder: string, skuRef: string): { path: string | null, status: string } {
    const directPath = path.join(clientFolder, skuRef);
    if (fs.existsSync(directPath) && fs.lstatSync(directPath).isFile()) return { path: directPath, status: "Exact Match" };
    
    // Búsqueda en carpetas (Provider Folder structure)
    if (fs.existsSync(directPath) && fs.lstatSync(directPath).isDirectory()) {
        const files = fs.readdirSync(directPath);
        const img = files.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        if (img) return { path: path.join(directPath, img), status: "Found inside Folder" };
    }

    // Fuzzy Match
    const allFiles = fs.readdirSync(clientFolder);
    const nameNoExt = path.parse(skuRef).name;
    const match = allFiles.find(f => f.toLowerCase().startsWith(nameNoExt.toLowerCase()) && /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (match) return { path: path.join(clientFolder, match), status: "Prefix Match" };

    return { path: null, status: "Not Found" };
}

// --- CONFIG ---
const SHOP_DOMAIN = normalizeShopDomain(process.env.SHOPIFY_SHOP_NAME);
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

const FITMENT_PATH = path.join(process.cwd(), '..', 'IND_MOTOS', 'fitment_master_v1.json');
const IMAGES_BASE_PATH = path.join(process.cwd(), '..', 'IND_MOTOS', 'Imagenes');
let FITMENT_DB: any[] = [];

// Recarga de DB en cada petición para desarrollo rápido (quitar en producción masiva si es lento)
function reloadDB() {
    if (fs.existsSync(FITMENT_PATH)) {
        try {
            FITMENT_DB = JSON.parse(fs.readFileSync(FITMENT_PATH, 'utf-8'));
        } catch (e) { console.error("Error DB", e); }
    }
}
reloadDB();

router.post('/publish', async (req, res) => {
    reloadDB(); // Asegurar que leemos el precio recién inyectado
    try {
        const { sku, dryRun } = req.body;

        if (!SHOP_DOMAIN || !TOKEN) {
            if (!dryRun) return res.status(500).json({ error: "Faltan credenciales SHOPIFY en .env" });
        }

        const product = FITMENT_DB.find((p: any) => p.sku_ref === sku);
        if (!product) return res.status(404).json({ error: 'SKU no encontrado en DB' });

        // --- SEO Título ---
        const fList = product.fitment.canonical || product.fitment.inferred || [];
        const fArr = Array.isArray(fList) ? fList : [fList];
        const uMakes = [...new Set(fArr.map((f:any) => f.marca).filter((x:any) => x && x !== 'GENERICA'))];
        const uModels = [...new Set(fArr.map((f:any) => f.modelo).filter((x:any) => x && x !== 'Varios'))];

        let smartTitle = product.title;
        if (uMakes.length > 0) smartTitle += ` para ${uMakes.slice(0, 2).join('/')}`;
        if (uModels.length > 0) smartTitle += ` ${uModels.slice(0, 3).join(' ')}`;
        smartTitle = smartTitle.replace(/\s+/g, ' ').trim();

        // --- PRECIO DINÁMICO (V11.9 FIX) ---
        // Convertimos el entero (32900) a string ("32900.00")
        const finalPrice = (product.price && product.price > 0) ? product.price.toString() : "0.00";

        const tags = [
            `odi_sku:${sku}`,
            `client:${product.client}`,
            `source:${product.fitment.source}`,
            ...uMakes.map(m => `fitment_brand:${m}`),
            ...uModels.slice(0, 10).map(m => `fitment_model:${m}`)
        ];

        // --- IMAGEN ---
        const imagesPayload = [];
        let imageStatus = "Not Found";
        const clientFolder = findClientFolder(IMAGES_BASE_PATH, product.client);

        if (clientFolder) {
            console.log(`🔎 Buscando img para SKU: ${product.sku_ref}`);
            const huntResult = findImageSmart(clientFolder, product.sku_ref);
            if (huntResult.path) {
                try {
                    const b64 = fs.readFileSync(huntResult.path).toString('base64');
                    imagesPayload.push({ attachment: b64, filename: path.basename(huntResult.path) });
                    imageStatus = `Loaded (${huntResult.status})`;
                } catch (e) { imageStatus = "Read Error"; }
            } else { imageStatus = huntResult.status; }
        }

        // Payload
        const shopifyPayload = {
            product: {
                title: smartTitle,
                body_html: `
                    <p><strong>Repuesto:</strong> ${product.title}</p>
                    <p><strong>Compatibilidad:</strong> ${uMakes.join(', ')} - ${uModels.join(', ')}</p>
                    <em>Verificado por ODI V11.9.</em>
                `,
                vendor: product.client,
                product_type: product.taxonomy?.system || "Repuesto",
                status: 'draft',
                tags: tags.join(', '),
                images: imagesPayload,
                variants: [{ 
                    price: finalPrice, // <--- AQUÍ ESTABA EL ERROR
                    sku: product.sku_ref, 
                    inventory_management: null 
                }]
            }
        };

        if (dryRun) return res.json({ ok: true, mode: "DRY-RUN", price: finalPrice });

        console.log(`🚀 ENVIANDO: "${smartTitle}" (Precio: $${finalPrice})`);
        
        const url = `https://${SHOP_DOMAIN}/admin/api/${VERSION}/products.json`;
        const response = await axios.post(url, shopifyPayload, {
            headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' }
        });

        console.log(`✅ PUBLICADO: ${response.data.product.id}`);
        res.json({ ok: true, shopify_id: response.data.product.id });

    } catch (e: any) {
        console.error("❌ ERROR SHOPIFY:", e.message);
        res.status(500).json({ error: e.message });
    }
});

export default router;