import { Router } from 'express';
import { db, SocialNetwork, SocialProfile, ContentPiece } from './db';
import crypto from 'crypto';
import { encryptToken } from './crypto_utils';

const router = Router();

// CONFIG
const TIER_PRIORITY = ["enterprise", "pro", "free"];
const TIER_MAP: Record<string, "free" | "pro" | "enterprise"> = {
    "TAG_PLAN_STARTUP": "pro", "TAG_PLAN_UNLIMITED": "enterprise", "TAG_PLAN_FREE": "free"
};
const PERMISSIONS = {
    free: { can_generate: true, can_publish_social: false },
    pro: { can_generate: true, can_publish_social: true },
    enterprise: { can_generate: true, can_publish_social: true }
};

// 1. WEBHOOK SYSTEME
router.post('/webhook/systeme', (req, res) => {
    try {
        if (process.env.SYSTEME_WEBHOOK_SECRET && req.query.secret !== process.env.SYSTEME_WEBHOOK_SECRET) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        const event = req.body;
        if (!event.data?.contact) return res.status(400).json({ error: "No contact" });
        
        const contact = event.data.contact;
        const userId = `usr_${crypto.createHash('sha1').update(contact.email).digest('hex').substring(0, 12)}`;
        
        // Determinar Tier
        const tags = contact.tags || [];
        const foundTiers = tags.map((t: any) => TIER_MAP[t.name] || TIER_MAP[t.tag_code]).filter(Boolean);
        const tier = foundTiers.sort((a: any, b: any) => TIER_PRIORITY.indexOf(a) - TIER_PRIORITY.indexOf(b))[0] || "free";

        // Upsert User
        let user = db.users.findOne(u => u.id === userId);
        if (!user) user = { id: userId, email: contact.email, name: contact.first_name, systeme: { contact_id: contact.id, tags: [] }, roles: ["member"], created_at: new Date().toISOString() };
        user.systeme.tags = tags.map((t:any)=>t.name);
        db.users.upsert(user);
        
        res.json({ status: "processed", user_id: userId, tier });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 2. SOCIAL CONNECT INIT
router.post('/social/connect/init', (req, res) => {
    try {
        const { systeme_contact_id, network } = req.body;
        // Simulamos URL de OAuth
        const mockUrl = `http://localhost:3000/api/v10/social/callback/${network}?code=mock_code&state=eyJ1aWQiOiJ1c3JfZGVtbyJ9`;
        res.json({ status: "ready", auth_url: mockUrl });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 3. SOCIAL CALLBACK (Simulado)
router.get('/social/callback/:network', (req, res) => {
    const userId = "usr_demo"; // En prod vendría del state
    const token = "access_token_simulado_" + Date.now();
    
    db.social_profiles.upsert({
        id: `soc_${userId}_${req.params.network}`,
        user_id: userId,
        network: req.params.network as SocialNetwork,
        handle: "@usuario_demo",
        auth: { access_token: encryptToken(token), expires_at: new Date(Date.now() + 86400000).toISOString() },
        status: "connected",
        last_sync: new Date().toISOString()
    });
    res.send("<h1>Conectado! Cierra esta ventana.</h1>");
});

// 4. SOCIAL STATUS
router.post('/social/status', (req, res) => {
    // Para demo asumimos usr_demo, en prod buscamos por systeme_contact_id
    const profiles = db.social_profiles.findAll().filter(p => p.user_id === "usr_demo");
    const map: any = {};
    profiles.forEach(p => map[p.network] = { connected: true, handle: p.handle });
    res.json({ social_accounts: map });
});

// 5. COMMANDS
router.post('/command', (req, res) => {
    const { command, payload } = req.body;
    if (command === 'social_schedule') {
        const id = `cnt_${Date.now()}`;
        db.content_calendar.upsert({
            id, user_id: "usr_demo", type: payload.type, copy: payload.copy,
            media_url: payload.media_url, networks: payload.networks, 
            status: "scheduled", created_at: new Date().toISOString()
        });
        return res.json({ status: "scheduled", id });
    }
    res.json({ status: "unknown" });
});

export const apiV10 = router;