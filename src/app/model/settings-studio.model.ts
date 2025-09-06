// IMPOSTAZIONI STUDIO / TENANT (ANNIDATE)
export type WorkingDay = '0' | '1' | '2' | '3' | '4' | '5' | '6';

/** ---- OUTPUT DAL BACKEND ---- */
export interface StudioDigitalDto {
    patientReminders?: boolean | null;
    allowPatientPortal?: boolean | null;
    emailSignature?: string | null;
}
export interface StudioAgendaDto {
    slotDuration?: number | null;       // minuti
    slotBuffer?: number | null;         // minuti
    workingDays?: WorkingDay[] | null;  // '0'..'6'
}
export interface StudioBillingDto {
    clinicName?: string | null;
    clinicPhone?: string | null;
    clinicAddress?: string | null;
    vatId?: string | null;
    iban?: string | null;
}

export interface StudioSettingsDto {
    studioId: string;
    digital?: StudioDigitalDto | null;
    agenda?: StudioAgendaDto | null;
    billing?: StudioBillingDto | null;
    settings?: Record<string, unknown> | null;
    createdAt?: string;
    updatedAt?: string;
}

/** ---- INPUT PATCH UNICO ANNIDATO ---- */
export interface StudioDigitalUpdateDto {
    patientReminders?: boolean;
    allowPatientPortal?: boolean;
    emailSignature?: string;
}
export interface StudioAgendaUpdateDto {
    slotDuration?: number;       // minuti
    slotBuffer?: number;         // minuti
    workingDays?: WorkingDay[];  // '0'..'6'
}
export interface StudioBillingUpdateDto {
    clinicName?: string;
    clinicPhone?: string;
    clinicAddress?: string;
    vatId?: string;
    iban?: string;
}
export interface StudioSettingsUpdateDto {
    digital?: StudioDigitalUpdateDto;
    agenda?: StudioAgendaUpdateDto;
    billing?: StudioBillingUpdateDto;
}
