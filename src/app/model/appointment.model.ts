export type AppointmentKind = 'VISIT' | 'FOLLOW_UP' | 'SURGERY' | 'CONSULT' | 'OTHER';
export type AppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'CLOSED' | 'CANCELLED';

export interface RefId { id: string; }

export interface UserDTO {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    accountType?: 'STUDIO_MEMBER' | 'INTERNET';
    roleGlobal?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface StudioDTO { id: string; name?: string; address?: string; phone?: string; }

export interface PatientDto {
    id: string;
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    SSN?: string;           // se il backend usa SSN maiuscolo
}

export interface DoctorDTO {
    id: string;
    user?: UserDTO;
    specialty?: string;
    licenseNumber?: string;
    licenseState?: string;
    bio?: string;
}

export interface AppointmentDTO {
    id: string;
    studio?: StudioDTO;     // può esserci in output
    patient: PatientDto;
    doctor?: DoctorDTO;
    createdBy?: UserDTO;

    kind: AppointmentKind;
    status: AppointmentStatus;

    startAt: string;        // ISO con offset
    endAt: string;

    reason?: string;
    notes?: string;

    canceledAt?: string;
    cancelReason?: string;

    createdAt?: string;
    updatedAt?: string;
}

/** INPUT: niente studio obbligatorio */
export interface AppointmentInputDTO {
    // studio?: RefId;      // <- se vuoi, lascialo opzionale; altrimenti rimuovi proprio la riga
    patient: RefId;
    doctor?: RefId;
    startAt: string;
    endAt: string;
    kind?: AppointmentKind;
    status?: AppointmentStatus;
    reason?: string;
    notes?: string;
}

// appointment.dto.ts

export interface AppointmentHistoryDTO {
    id: string;
    kind: AppointmentKind; // es. "VISIT"
    reason: string;
    notes: string | null;
    status: AppointmentStatus; // es. "BOOKED"
    startAt: string; // ISO string
    endAt: string;   // ISO string
    createdAt: string;
    updatedAt: string;
    canceledAt: string | null;
    cancelReason: string | null;
    createdBy: string | null;
    doctor: DoctorDto;
    patient: PatientDto;
    studio: StudioDto;
}

// history-item.model.ts
export interface HistoryItem {
    id: string;
    date: Date;
    description: string;
    studioName?: string;
    doctorName?: string;
    patientName?: string;
    status?: string;
}

export interface DoctorDto {
    id: string;
    firstname: string;
    lastname: string;
    email?: string; // opzionale se nel JSON futuro
}

export interface StudioDto {
    id: string;
    name: string;
    address?: string;
}
