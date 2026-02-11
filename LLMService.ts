import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export interface IDepthAnalysis {
    visual_prompt_en: string;
    commercial_title: string;
    sales_copy: string;
    detected_price: number | null;
    intent_category: string;
}

export class LLMService {
    private openai: OpenAI | null = null;
    private gemini: any | null = null;
    private provider: string = 'GEMINI'; 

    constructor() {
        // Inicializar Gemini
        if (process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            // CAMBIO CRÍTICO: Usamos el alias genérico que apareció en tu lista
            this.gemini = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            console.log("   ✨ Gemini Flash (Latest) cargado.");
        }

        // Inicializar OpenAI (lo dejamos listo por si resuelves lo del banco)
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }

        this.provider = process.env.AI_PROVIDER || 'GEMINI';
    }

    public async analyze(userText: string): Promise<IDepthAnalysis> {
        console.log(`   🧠 CEREBRO ACTIVO (${this.provider}): Analizando "${userText}"...`);

        try {
            if (this.provider === 'OPENAI' && this.openai) {
                return await this.thinkWithGPT(userText);
            } else if (this.gemini) {
                return await this.thinkWithGemini(userText);
            } else {
                throw new Error("No hay cerebros configurados.");
            }
        } catch (error: any) {
            console.error(`   ❌ Fallo en ${this.provider}:`, error.message);
            
            // Fallback
            if (this.provider === 'OPENAI' && this.gemini) {
                console.log("   ⚠️ Switching a Gemini de respaldo...");
                return await this.thinkWithGemini(userText);
            }
            return this.emergencyLobotomy(userText);
        }
    }

    private async thinkWithGemini(text: string): Promise<IDepthAnalysis> {
        const systemInstruction = this.getSystemPrompt();
        const prompt = `${systemInstruction}\n\nUSER INPUT: "${text}"\n\nResponde SOLO con el JSON raw:`;
        
        const result = await this.gemini.generateContent(prompt);
        const response = await result.response;
        let cleanJson = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            return JSON.parse(cleanJson);
        } catch (e) {
            const match = cleanJson.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            throw e;
        }
    }

    private async thinkWithGPT(text: string): Promise<IDepthAnalysis> {
        const completion = await this.openai!.chat.completions.create({
            messages: [
                { role: "system", content: this.getSystemPrompt() },
                { role: "user", content: text }
            ],
            model: "gpt-3.5-turbo-0125",
            response_format: { type: "json_object" },
            temperature: 0.7,
        });
        return JSON.parse(completion.choices[0].message.content || "{}");
    }

    private getSystemPrompt(): string {
        return `
        Eres el Córtex Visual de ODI.
        INPUT: "${"Texto usuario"}"
        OUTPUT JSON:
        {
            "visual_prompt_en": "Descripción visual en inglés para Freepik (8k, photorealistic).",
            "commercial_title": "Título del producto en español.",
            "sales_copy": "Descripción de venta persuasiva.",
            "detected_price": null,
            "intent_category": "visual_generate"
        }
        `;
    }

    private emergencyLobotomy(text: string): IDepthAnalysis {
        return {
            visual_prompt_en: "generic futuristic product, white background",
            commercial_title: "Producto Concepto",
            sales_copy: "Generado en modo seguro.",
            detected_price: null,
            intent_category: "error"
        };
    }
}