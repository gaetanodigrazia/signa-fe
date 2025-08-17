export interface PatientDto {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    address: string;
    phone?: string | null;
    SSN: string;
    dateOfBirth: string; // ISO,
    active: boolean;
}

export interface CreatePatientDto {
    firstname: string;
    lastname: string;
    email: string;
    address?: string | null;
    phone?: string | null;
    SSN: string;
    dateOfBirth: string; // ISO (opzionale se il backend lo consente)
    active: boolean;
}

/** Model usato dal form UI (più comodo per l'utente) */
export interface PatientForm {
    id?: string;
    firstname: string;
    lastname: string;
    email: string;
    address?: string;
    phone?: string | null;
    ssn?: string | null;           // minuscolo nel form
    dateOfBirth: string;           // ISO yyyy-MM-dd
    active?: boolean;
}

export type PatientStatus = 'active' | 'inactive' | 'all';
