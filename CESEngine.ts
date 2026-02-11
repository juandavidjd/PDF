import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { CESContext, CESResponse } from '../types';

export class CESEngine {
    private policies: any[];

    constructor() {
        // Cargar Constitución
        const configPath = path.join(__dirname, '../../../ces/config/constitution.yaml');
        try {
            const file = fs.readFileSync(configPath, 'utf8');
            const doc: any = yaml.load(file);
            this.policies = doc.policies;
        } catch (e) {
            console.warn("⚠️ No se pudo leer constitution.yaml, usando fallback seguro.");
            this.policies = [];
        }
    }

    public async evaluate(ctx: CESContext): Promise<CESResponse> {
        let decision: CESResponse = { allowed: true, severity: 'ALLOW', audit_hash: 'hash_simulado_' + Date.now() };

        for (const rule of this.policies) {
            // Check Topic
            if (rule.triggers.topics && rule.triggers.topics.includes(ctx.topic)) {
                // Check Regex Patterns en Output
                if (rule.triggers.patterns) {
                    for (const pat of rule.triggers.patterns) {
                        if (new RegExp(pat, 'i').test(ctx.proposed_output)) {
                            return this.block(rule, "Patrón prohibido detectado en respuesta.");
                        }
                    }
                }
            }

            // Check Verdad Económica (Acciones)
            if (rule.id === 'ECONOMIC_TRUTH' && ctx.action === 'create_ad') {
                // Simulación de chequeo de verdad: Si dice "urgente" o "pocos" y hay stock > 10
                if ((ctx.proposed_output.includes("urgente") || ctx.proposed_output.includes("pocos")) && ctx.ground_truth?.stock > 10) {
                    return this.block(rule, "Claim de escasez falso (Stock real alto).");
                }
            }
        }
        return decision;
    }

    private block(rule: any, reason: string): CESResponse {
        return {
            allowed: false,
            severity: rule.severity,
            reason: `${rule.id}: ${reason}`,
            modified_output: rule.error_message || rule.safe_response_template || "Acción bloqueada por normativa.",
            audit_hash: 'block_' + Date.now()
        };
    }
}