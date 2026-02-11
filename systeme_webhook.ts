import { Router } from 'express';
import { db } from './db';

const router = Router();

// Mapeo simple de Tags de Systeme a Niveles de ODI
// En producción, esto podría estar en un config file
const TIER_MAP: Record<string, "free" | "pro" | "enterprise"> = {
    "TAG_PLAN_FREE": "free",
    "TAG_PLAN_STARTUP": "pro",
    "TAG_PLAN_UNLIMITED": "enterprise"
};

// --- ENDPOINT: POST /webhooks/systeme ---
router.post('/systeme', (req, res) => {
    try {
        const event = req.body;
        
        // Log de auditoría crudo
        console.log(`📡 WEBHOOK SYSTEME RECIBIDO: ${event.type}`);

        // VALIDACIÓN BÁSICA DE SEGURIDAD
        // (En prod, verificar firma o token en query param ?secret=xyz)
        
        const contact = event.data?.contact;
        if (!contact) {
             return res.status(400).json({ error: "No contact data" });
        }

        const email = contact.email;
        const systemeId = contact.id;
        const tags = contact.tags || [];

        // 1. UPSERT USUARIO (Idempotente)
        // Buscamos si ya existe por email o systeme_id
        let user = db.users.findOne(u => u.email === email);
        
        if (!user) {
            user = {
                id: `usr_${Date.now()}`, // Generación de ID interno
                email: email,
                name: contact.first_name || "Usuario",
                systeme: { contact_id: systemeId, tags: [] },
                roles: ["member"],
                created_at: new Date().toISOString()
            };
            console.log(`👤 NUEVO USUARIO CREADO: ${email}`);
        }
        
        // Actualizamos tags siempre
        user.systeme.tags = tags.map((t: any) => t.id);
        db.users.upsert(user);

        // 2. DETECCIÓN DE INDUSTRIA Y MEMBRESÍA
        // Recorremos todas las industrias conocidas para ver si el usuario tiene el TAG de esa industria
        const allIndustries = db.industries.findAll();
        
        for (const ind of allIndustries) {
            // ¿El usuario tiene el tag de esta industria?
            const hasTag = tags.some((t: any) => t.id == ind.systeme.tag_id);
            
            if (hasTag) {
                // Determinar Tier basado en otros tags
                let tier: "free" | "pro" | "enterprise" = "free";
                tags.forEach((t: any) => {
                    if (TIER_MAP[t.name]) tier = TIER_MAP[t.name];
                });

                // Upsert Membresía
                const membershipId = `mbr_${user.id}_${ind.id}`;
                db.memberships.upsert({
                    id: membershipId,
                    user_id: user.id,
                    industry_id: ind.id,
                    tier: tier,
                    permissions: {
                        can_generate: true, // Lógica base
                        can_publish: tier !== "free",
                        daily_limit: tier === "enterprise" ? 1000 : 20
                    },
                    status: "active"
                });
                console.log(`🏭 MEMBRESÍA ACTIVADA: ${user.name} -> ${ind.name} [${tier}]`);
            }
        }

        return res.status(200).json({ status: "processed", odi_user_id: user.id });

    } catch (error: any) {
        console.error("❌ ERROR WEBHOOK:", error.message);
        return res.status(500).json({ error: "Internal Error" });
    }
});

export const systemeRouter = router;