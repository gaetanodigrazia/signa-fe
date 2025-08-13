export interface Appointment {
    id: string; // UUID o ID univoco
    title: string;
    description?: string;
    start: Date;
    end?: Date;
    userId?: string;
    createdAt: Date;
    updatedAt?: Date;

    // Dati extra per l'integrazione con il calendario
    meta?: {
        description?: string;
        userId?: string;
    };
}
