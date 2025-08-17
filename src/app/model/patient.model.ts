export interface PatientDto {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    address: string;
    SSN: string;
    dateOfBirth: string; // ISO,
    active: boolean
}
export interface CreatePatientDto {
    firstname: string;
    lastname: string;
    email: string;
    address: string;
    SSN: string;
    dateOfBirth: string; // ISO (opzionale se il backend lo consente)
    active: boolean
}
export type PatientStatus = 'active' | 'inactive' | 'all';
