import fs from 'fs';
import path from 'path';

// --- TIPOS ---
export interface Industry { id: string; name: string; slug: string; systeme: { tag_id: string; funnel_id: string; landing_url: string; }; catalog_mode: string; status: string; }
export interface User { id: string; email: string; name: string; systeme: { contact_id: string; tags: string[]; }; roles: string[]; created_at: string; }
export interface Membership { id: string; user_id: string; industry_id: string; tier: "free" | "pro" | "enterprise"; permissions: any; status: string; }
export interface ShopifyStore { id: string; user_id: string; industry_id: string; shop_domain: string; access_token: string; status: string; }
export interface Product { id: string; user_id: string; industry_id: string; title: string; price: string; image_ref: string; status: string; }

// TIPOS V10.3 SOCIAL
export type SocialNetwork = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'whatsapp';
export interface SocialProfile {
    id: string; user_id: string; network: SocialNetwork; handle: string;
    auth: { access_token: string; expires_at: string; }; status: string; last_sync: string;
}
export interface ContentPiece {
    id: string; user_id: string; type: string; copy: string; media_url: string;
    networks: SocialNetwork[]; scheduled_for?: string; status: string; created_at: string;
}

// --- ENGINE JSON ---
const DATA_DIR = path.join(process.cwd(), 'data', 'v10');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class JsonTable<T extends { id: string }> {
    private filePath: string;
    private data: T[] = [];
    constructor(filename: string) { this.filePath = path.join(DATA_DIR, filename); this.load(); }
    private load() { try { this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')); } catch { this.data = []; } }
    private save() { fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2)); }
    findAll() { return this.data; }
    findOne(predicate: (item: T) => boolean) { return this.data.find(predicate); }
    upsert(item: T) {
        const index = this.data.findIndex(i => i.id === item.id);
        if (index >= 0) this.data[index] = { ...this.data[index], ...item };
        else this.data.push(item);
        this.save();
    }
}

export const db = {
    industries: new JsonTable<Industry>('industries.json'),
    users: new JsonTable<User>('users.json'),
    memberships: new JsonTable<Membership>('memberships.json'),
    stores: new JsonTable<ShopifyStore>('stores.json'),
    products: new JsonTable<Product>('products.json'),
    social_profiles: new JsonTable<SocialProfile>('social_profiles.json'),
    content_calendar: new JsonTable<ContentPiece>('content_calendar.json')
};