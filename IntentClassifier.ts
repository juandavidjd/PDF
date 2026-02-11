import { IIntentAnalysis, Domain } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export class IntentClassifier {
    private gemini: any | null = null;

    // REGEX DE SEGURIDAD (Esto no se negocia con IA, debe ser instantáneo)
    private CRITICAL_REGEX = /(suicidio|matarme|muerte|acabar con todo)/i;
    // REGEX DE NEGACIÓN (Para frenar ventas rápido)
    private NEGATIVE_REGEX = /(no me sirve|no me gusta|no quiero|cancelar|mejor no|feo|horrible|detener|parar|borra eso|olvídalo|así no|ninguno)/i;
    // REGEX DE CONFIRMACIÓN DE VENTA (Simple y rápida)
    private VISUAL_CONFIRM_REGEX = /(me sirve|me gusta|usa esta|úsala|está bien|perfecta|guárdala|excelente|esa es|compro|dale|de una)/i;

    constructor() {
        // Usamos Gemini Flash porque es ultrarrápido para clasificar en tiempo real
        if (process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.gemini = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        }
    }

    public async classify(input: string): Promise<IIntentAnalysis> {
        const text = input.toLowerCase();

        // --- NIVEL 1: REFLEJOS RÁPIDOS (Regex) ---
        // Lo usamos para cosas que no pueden esperar a la IA (Seguridad, Negación, Confirmación simple)

        if (this.CRITICAL_REGEX.test(text)) return { topic: 'self_harm', domain: 'VITAL', impact: 'CRITICAL', requires_human: true, raw_input: input };
        
        if (this.NEGATIVE_REGEX.test(text)) {
            return { topic: 'operational', domain: 'OPERATIONAL', impact: 'LOW', requires_human: false, raw_input: input };
        }

        // Si el usuario está confirmando un diseño visual
        if (this.VISUAL_CONFIRM_REGEX.test(text)) {
             // Filtramos que no sea una confirmación de borrado
             if (!text.includes("confirmo") && !text.includes("proceder")) {
                return { topic: 'visual_confirm', domain: 'CREATIVE', impact: 'HIGH', requires_human: true, raw_input: input };
             }
        }

        // --- NIVEL 2: INTELIGENCIA SEMÁNTICA (Gemini) ---
        // Si no es un reflejo rápido, le preguntamos al Cerebro qué quiso decir el usuario.
        // Aquí es donde matamos las listas de palabras clave incompletas.

        if (this.gemini) {
            try {
                const classification = await this.askGeminiToClassify(input);
                return {
                    topic: classification.topic,
                    domain: classification.domain as Domain,
                    impact: 'MEDIUM',
                    requires_human: classification.requires_human,
                    raw_input: input
                };
            } catch (error) {
                console.error("❌ Fallo en clasificación semántica, usando fallback...", error);
                return { topic: 'operational', domain: 'OPERATIONAL', impact: 'LOW', requires_human: false, raw_input: input };
            }
        }

        // Fallback total si no hay internet/API
        return { topic: 'operational', domain: 'OPERATIONAL', impact: 'LOW', requires_human: false, raw_input: input };
    }

    // EL ENRUTADOR SEMÁNTICO
    private async askGeminiToClassify(text: string): Promise<{ topic: string, domain: string, requires_human: boolean }> {
        const prompt = `
        Actúa como un Router de Intenciones para un sistema de eCommerce.
        Clasifica la siguiente frase del usuario en una de estas categorías EXACTAS:

        CATEGORÍAS:
        1. "visual_generate": El usuario quiere ver, crear, imaginar, diseñar o generar una imagen de un producto. (Ej: "Imagínate...", "Qué tal unos tenis...", "Quisiera ver...", "Hazme un diseño...").
        2. "shopify_delete_request": El usuario quiere borrar, eliminar o limpiar productos/inventario.
        3. "shopify_confirm": El usuario confirma una acción crítica (dice "confirmo", "procede", "estoy seguro").
        4. "shopify_audit": El usuario pregunta qué hay en la tienda, inventario o pide recomendación sobre lo que hay.
        5. "input_price": El usuario está diciendo un precio o valor monetario.
        6. "operational": Saludos, insultos, rechazos o charla general que no es una orden comercial.

        INPUT: "${text}"

        Responde SOLO con un JSON válido:
        { "topic": "...", "domain": "CREATIVE" | "ECONOMIC" | "OPERATIONAL", "requires_human": boolean }
        `;

        const result = await this.gemini.generateContent(prompt);
        const response = result.response.text();
        
        // Limpieza de JSON
        const cleanJson = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    }
}