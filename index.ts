// 1. DOMINIOS DEL SISTEMA
export type Domain = 'VITAL' | 'ECONOMIC' | 'OPERATIONAL' | 'ETHICAL' | 'CREATIVE';

// 2. INTERFAZ DE ANÁLISIS DE INTENCIÓN
export interface IIntentAnalysis {
    topic: string;
    domain: Domain;
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requires_human: boolean;
    raw_input: string;
}

// 3. INTERFAZ DE BORRADOR (UNIVERSAL & TOLERANTE)
export interface IActionDraft {
    id?: string;            
    action_type?: string;   
    target_system?: string; 
    context_summary?: string; 
    
    // CAMBIO CLAVE: '?' para que sea opcional y no rompa el código viejo
    intent?: IIntentAnalysis; 
    
    content: {
        message: string;
        action_type?: string; 
        payload?: any;
    };
    
    timestamp?: number;     
}

// 4. INTERFACES DEL MOTOR ÉTICO (CES)
export interface CESContext {
    user_id: string;
    topic: string;
    action: string;
    proposed_output: string;
    ground_truth?: any; 
}

export interface CESResponse {
    allowed: boolean;
    risk_level?: number; 
    reason?: string;     
    modified_output?: string;
    severity?: string; 
    audit_hash?: string;
}

// Alias por compatibilidad
export type ICESVerdict = CESResponse;