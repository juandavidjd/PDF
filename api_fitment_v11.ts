import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// RUTAS ABSOLUTAS
const FITMENT_PATH = path.join(process.cwd(), '..', 'IND_MOTOS', 'fitment_master_v1.json');
const TAXONOMY_PATH = path.join(process.cwd(), '..', 'IND_MOTOS', 'taxonomy_motos_v1.json');

let FITMENT_DB: any[] = [];
let TAXONOMY_DB: any = {};

// CARGADOR DE MEMORIA
function loadData() {
    try {
        if (fs.existsSync(FITMENT_PATH)) {
            FITMENT_DB = JSON.parse(fs.readFileSync(FITMENT_PATH, 'utf-8'));
            console.log(`🏍️  V11 FITMENT: ${FITMENT_DB.length} referencias cargadas.`);
        }
        if (fs.existsSync(TAXONOMY_PATH)) {
            TAXONOMY_DB = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf-8'));
            console.log(`🗂️  V11 TAXONOMY: Árbol cargado.`);
        }
    } catch (e) {
        console.error("❌ Error cargando DB V11:", e);
    }
}
loadData();

// --- ENDPOINTS ---

router.get('/taxonomy', (req, res) => {
    res.json(TAXONOMY_DB);
});

router.post('/search', (req, res) => {
    const { make, model, system, component, query, minConfidence = 0.1 } = req.body;

    const qMake = make ? make.toString().toUpperCase().trim() : null;
    const qModel = model ? model.toString().toUpperCase().trim() : null;
    const qSystem = system ? system.toString().toUpperCase().trim() : null;
    const qComponent = component ? component.toString().toUpperCase().trim() : null;
    const qText = query ? query.toString().toLowerCase().trim() : null;

    console.log(`🔍 BUSCANDO: Make=${qMake} Text=${qText}`);

    let results = FITMENT_DB.filter(p => {
        if ((p.confidence || 0) < minConfidence) return false;
        if (qText) {
            const titleMatch = p.title && p.title.toLowerCase().includes(qText);
            const skuMatch = p.sku_ref && p.sku_ref.toLowerCase().includes(qText);
            if (!titleMatch && !skuMatch) return false;
        }
        if (qSystem && p.taxonomy?.system?.toUpperCase() !== qSystem) return false;
        if (qComponent && p.taxonomy?.component?.toUpperCase() !== qComponent) return false;
        if (qMake || qModel) {
            const list = p.fitment.canonical || p.fitment.inferred || [];
            const arr = Array.isArray(list) ? list : [list];
            const fitmentMatch = arr.some((x: any) => {
                if (!x) return false;
                const mk = qMake ? (x.marca && x.marca.toUpperCase() === qMake) : true;
                const md = qModel ? (x.modelo && x.modelo.toUpperCase().includes(qModel)) : true;
                return mk && md;
            });
            if (!fitmentMatch) return false;
        }
        return true;
    });

    console.log(`   ✅ ENCONTRADOS: ${results.length}`);

    const limit = 50;
    res.json({
        total: results.length,
        results: results.slice(0, limit).map(r => ({
            id: r.sku_ref,
            title: r.title,
            // 👇 AQUÍ ESTÁ LA MAGIA: Tu URL de Ngrok actual
            image: `https://indoor-lurlene-nonpardoning.ngrok-free.dev/media/${r.client}/${r.sku_ref}`,
            taxonomy: r.taxonomy,
            fitment_badges: [...new Set(
                (Array.isArray(r.fitment.canonical || r.fitment.inferred) 
                    ? (r.fitment.canonical || r.fitment.inferred) 
                    : [r.fitment.canonical || r.fitment.inferred])
                .map((x:any) => x?.marca)
                .filter(Boolean)
            )].slice(0, 3),
            confidence: r.confidence,
            source: r.fitment.source
        }))
    });
});

export default router;