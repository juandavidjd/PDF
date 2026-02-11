import dotenv from 'dotenv';
dotenv.config();

type ShopifyProductResponse = {
  products?: Array<{ id: number; title: string; tags: string }>;
  product?: { id: number; title: string };
};

export class ShopifyService {
    private baseUrl: string;
    private token: string;

    constructor() {
        const store = process.env.SHOPIFY_STORE_URL || "";
        const cleanStore = store.replace(/^https?:\/\//, '').replace(/\/$/, '');
        this.baseUrl = `https://${cleanStore}/admin/api/2024-01`;
        this.token = process.env.SHOPIFY_ACCESS_TOKEN || "";
    }

    private headers() {
        return {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": this.token,
        };
    }

    // --- AUDITOR ---
    public async auditStore(): Promise<string> {
        if (!this.token) return "Token de Shopify no configurado.";
        try {
            const r = await fetch(`${this.baseUrl}/products/count.json`, { method: "GET", headers: this.headers() });
            if (!r.ok) return "Error conectando a Shopify.";
            const data: any = await r.json();
            return `Auditoría lista. Tienes ${data.count} productos activos.`;
        } catch { return "Error técnico."; }
    }

    // --- CONSTRUCTOR BÁSICO ---
    public async create3TestProducts(): Promise<string> {
        const payloads = [
            { title: "TEST ODI 1", sku: "ODI-001" },
            { title: "TEST ODI 2", sku: "ODI-002" },
            { title: "TEST ODI 3", sku: "ODI-003" },
        ].map((p) => ({
            product: {
                title: p.title, vendor: "ODI Lab", product_type: "Test", tags: "TEST_ODI",
                variants: [{ price: "0.00", sku: p.sku }]
            },
        }));
        
        let count = 0;
        for (const p of payloads) {
            const r = await fetch(`${this.baseUrl}/products.json`, { method: "POST", headers: this.headers(), body: JSON.stringify(p) });
            if (r.ok) count++;
        }
        return `He creado ${count} productos de prueba.`;
    }

    // --- VENDEDOR EXPERTO (HUMANIZADO) ---
    public async createProductWithImage(title: string, base64Image: string, priceStr: string): Promise<string> {
        
        // 1. LIMPIEZA DE PRECIO
        let cleanPrice = priceStr.toLowerCase()
            .replace(/pesos/g, '')
            .replace(/[^0-9.,]/g, '') 
            .replace(/[.,]/g, '');     
            
        if (priceStr.toLowerCase().includes('mil') || priceStr.toLowerCase().includes('k')) {
            if (cleanPrice.length <= 3) cleanPrice = cleanPrice + "000";
        }
        if (!cleanPrice || isNaN(Number(cleanPrice)) || Number(cleanPrice) === 0) cleanPrice = "100000";

        // 2. LIMPIEZA DE TÍTULO (Doble seguridad)
        const finalTitle = title.replace(/google/gi, "").trim().toUpperCase();

        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

        const payload = {
            product: {
                title: finalTitle + " (AI DESIGN)",
                body_html: `<p><strong>PRODUCTO EXCLUSIVO</strong></p><p>Diseño generado por Inteligencia Artificial.</p>`,
                vendor: "ODI Creative Studio",
                product_type: "Concept Art",
                tags: "TEST_ODI, VISUAL, IA_GENERATED",
                status: "active",
                variants: [{ 
                    price: cleanPrice + ".00", 
                    sku: "ODI-IA-" + Math.floor(Math.random() * 10000), 
                    inventory_quantity: 50,
                    requires_shipping: true
                }],
                images: [ { attachment: cleanBase64 } ]
            }
        };

        try {
            const r = await fetch(`${this.baseUrl}/products.json`, {
                method: "POST",
                headers: this.headers(),
                body: JSON.stringify(payload)
            });

            if (!r.ok) {
                const err = await r.text();
                console.error("Shopify Upload Error:", err);
                return "Hubo un problema subiendo el producto.";
            }

            const data: any = await r.json();
            
            // --- AQUÍ ESTÁ EL TRUCO DE LA VOZ NATURAL ---
            let humanPrice = cleanPrice;
            // Si termina en 000 (ej: 400000), cortamos los ceros y ponemos "mil"
            if (humanPrice.endsWith("000") && humanPrice.length > 3) {
                humanPrice = humanPrice.substring(0, humanPrice.length - 3) + " mil";
            }
            // Resultado: "400 mil"

            return `Listo. Publiqué "${data.product?.title}" en la tienda. Quedaron en ${humanPrice} pesos.`;

        } catch (e: any) {
            return `Error crítico: ${e.message}`;
        }
    }

    // --- DESTRUCTOR (SEGURIDAD) ---
    public async deleteTestProducts(): Promise<string> {
        console.log("   🗑️ EJECUTANDO PROTOCOLO DE LIMPIEZA...");
        try {
            const r = await fetch(`${this.baseUrl}/products.json?limit=250&fields=id,title,tags`, { method: "GET", headers: this.headers() });
            const data = (await r.json()) as ShopifyProductResponse;
            
            const targets = (data.products || []).filter(p => p.tags.includes("TEST_ODI"));

            if (targets.length === 0) return "La tienda ya está limpia.";

            let count = 0;
            for (const p of targets) {
                await fetch(`${this.baseUrl}/products/${p.id}.json`, { method: "DELETE", headers: this.headers() });
                count++;
            }
            return `Limpieza completada. Eliminados ${count} productos.`;
        } catch (e) { return "Error durante la limpieza."; }
    }
}