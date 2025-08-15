export interface PatientDto {
    uuid: string;
    firstname: string;
    lastname: string;
    email: string;
    address: string;
    SSN: string;
    dateOfBirth: string; // ISO
}
export interface CreatePatientDto {
    firstname: string;
    lastname: string;
    email: string;
    address: string;
    SSN: string;
    dateOfBirth: string; // ISO (opzionale se il backend lo consente)
}