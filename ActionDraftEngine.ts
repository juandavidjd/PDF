import { IIntentAnalysis, IActionDraft } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ActionDraftEngine {
    
    // Simula el LLM para no depender de API Keys ahora mismo
    public async createDraft(intent: IIntentAnalysis, input: string): Promise<IActionDraft> {
        let content: any = {};
        let target: 'user_chat' | 'shopify' = 'user_chat';

        if (intent.domain === 'ECONOMIC') {
            target = 'shopify';
            // Si el usuario pide mentir, el borrador lo intenta (ingenuamente), el CES lo frenará.
            if (input.includes("urgente") || input.includes("mentira")) {
                content = { message: "¡Compra ya! Quedan muy pocos (urgente).", type: "ad_copy" };
            } else {
                content = { message: "Campaña de zapatos de calidad.", type: "ad_copy" };
            }
        } else if (intent.domain === 'VITAL') {
            content = { message: "Estoy aquí contigo. No voy a ninguna parte." };
        } else {
            // Chat normal
            content = { message: `Entendido. Procesando solicitud sobre: ${intent.topic}.` };
        }

        return {
            id: uuidv4(),
            action_type: intent.domain === 'ECONOMIC' ? 'CREATE_RESOURCE' : 'TEXT_RESPONSE',
            target_system: target,
            content: content,
            context_summary: `Topic: ${intent.topic}`
        };
    }
}