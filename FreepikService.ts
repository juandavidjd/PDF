import dotenv from 'dotenv';
dotenv.config();

export class FreepikService {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.FREEPIK_API_KEY || "";
    }

    public async generateImage(prompt: string): Promise<{ success: boolean, data?: string, error?: string }> {
        // Validación básica
        if (!this.apiKey || this.apiKey.length < 5) {
            return { success: false, error: "Falta API Key de Freepik en .env" };
        }

        console.log(`   🎨 PINTANDO CON FREEPIK: "${prompt}"...`);

        try {
            // Endpoint oficial Text-to-Image
            const response = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-freepik-api-key': this.apiKey
                },
                body: JSON.stringify({
                    prompt: prompt,
                    num_images: 1,
                    // Tamaño cuadrado ideal para e-commerce
                    image: { size: "square_1_1" }
                    // ⚠️ NOTA: Hemos eliminado el objeto 'styling' para evitar el error 400.
                    // El estilo ahora se define 100% en el texto del prompt.
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                // Lanzamos error con detalle para verlo en consola
                throw new Error(`Freepik API Error: ${response.status} - ${errText}`);
            }

            const result: any = await response.json();
            
            // Verificamos si hay imagen
            if (result.data && result.data.length > 0) {
                const base64Image = result.data[0].base64;
                return { success: true, data: base64Image };
            } else {
                return { success: false, error: "La API respondió OK pero no envió imagen." };
            }

        } catch (error: any) {
            console.error("❌ Error Freepik:", error.message);
            return { success: false, error: error.message };
        }
    }
}