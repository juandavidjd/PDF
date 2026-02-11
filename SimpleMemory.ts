import * as fs from 'fs/promises';
import * as path from 'path';

const MEMORY_PATH = path.join(__dirname, '../../../ces/data/memory_episodic.json');

interface Note {
    id: number;
    text: string;
    date: string;       // Fecha de creación
    remind_at?: number; // Timestamp para avisar (Opcional)
    status: 'PENDING' | 'DONE';
}

export class SimpleMemory {
    
    constructor() { this.init(); }

    private async init() {
        try { await fs.access(MEMORY_PATH); } 
        catch { await fs.writeFile(MEMORY_PATH, '[]', 'utf-8'); }
    }

    // A. ESCRIBIR (Con detección básica de tiempo "en X minutos")
    public async addNote(text: string): Promise<string> {
        const data = await this.readAll();
        
        let remindTime = undefined;
        // Lógica simple: si dice "en X minutos", calculamos el timestamp
        const timeMatch = text.match(/en (\d+) minuto/i);
        if (timeMatch) {
            const minutes = parseInt(timeMatch[1]);
            remindTime = Date.now() + (minutes * 60 * 1000);
        }

        const note: Note = {
            id: Date.now(),
            text: text,
            date: new Date().toLocaleString(),
            remind_at: remindTime,
            status: 'PENDING'
        };
        
        data.push(note);
        await this.save(data);
        
        return remindTime ? `Entendido. Te avisaré en ${timeMatch![1]} minutos.` : "Anotado en bitácora.";
    }

    // B. LEER (Solo las pendientes)
    public async getRecentNotes(limit: number = 3): Promise<string[]> {
        const data = await this.readAll();
        return data
            .filter((n: Note) => n.status === 'PENDING')
            .slice(-limit)
            .reverse()
            .map((n: Note) => `[${n.date}] ${n.text}`);
    }

    // C. VIGILAR (Busca recordatorios vencidos y los marca como DONE)
    public async checkReminders(): Promise<string | null> {
        const data = await this.readAll();
        const now = Date.now();
        let alertMessage = null;

        // Buscamos la primera nota vencida que esté pendiente
        const dueNote = data.find((n: Note) => n.status === 'PENDING' && n.remind_at && n.remind_at <= now);

        if (dueNote) {
            dueNote.status = 'DONE'; // Marcar como leída para no repetir
            await this.save(data);
            alertMessage = `RECORDATORIO: ${dueNote.text}`;
        }

        return alertMessage;
    }

    private async readAll(): Promise<Note[]> {
        try { return JSON.parse(await fs.readFile(MEMORY_PATH, 'utf-8')); } catch { return []; }
    }
    
    private async save(data: Note[]) {
        await fs.writeFile(MEMORY_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }
}