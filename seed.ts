import { db } from './db';

// 1. Crear Industria
db.industries.upsert({
    id: "ind_calzado",
    name: "Calzado",
    slug: "calzado",
    systeme: { tag_id: "TAG_CALZADO", funnel_id: "FUN_CALZADO", landing_url: "..." },
    catalog_mode: "aggregate_users",
    status: "active"
});

// 2. Crear Usuario "Doña Marta"
db.users.upsert({
    id: "usr_marta",
    email: "marta@gmail.com",
    name: "Marta",
    systeme: { contact_id: "CTC_999", tags: ["TAG_CALZADO"] },
    roles: ["member"],
    created_at: new Date().toISOString()
});

// 3. Unir Marta a Calzado
db.memberships.upsert({
    id: "mbr_marta_calzado",
    user_id: "usr_marta",
    industry_id: "ind_calzado",
    tier: "pro",
    permissions: { can_generate: true, can_publish: true, daily_limit: 10 },
    status: "active"
});

console.log("🌱 SEMILLA V10 PLANTADA.");