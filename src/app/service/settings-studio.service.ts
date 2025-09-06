// src/app/settings/service/studio-settings.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type WeekdayCode = string;

export interface StudioSettingsDto {
    studioId: string;
    digital?: { patientReminders?: boolean; allowPatientPortal?: boolean; emailSignature?: string | null } | null;
    agenda?: { slotDuration?: number; slotBuffer?: number; workingDays?: WeekdayCode[] | null } | null;
    billing?: { clinicName?: string; clinicPhone?: string; clinicAddress?: string; vatId?: string; iban?: string } | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface StudioSettingsUpdateDto {
    digital?: { patientReminders?: boolean; allowPatientPortal?: boolean; emailSignature?: string };
    agenda?: { slotDuration?: number; slotBuffer?: number; workingDays?: WeekdayCode[] };
    billing?: { clinicName?: string; clinicPhone?: string; clinicAddress?: string; vatId?: string; iban?: string };
}

@Injectable({ providedIn: 'root' })
export class SettingsStudioService {
    private readonly baseUrl = `${API_BASE_URL}/studio/settings`;

    constructor(private http: HttpClient) { }

    /** GET impostazioni correnti */
    getSettings(): Observable<StudioSettingsDto | null> {
        return this.http.get<StudioSettingsDto | null>(this.baseUrl);
    }

    /** PATCH aggiornamento */
    updateSettings(patch: StudioSettingsUpdateDto): Observable<StudioSettingsDto> {
        return this.http.patch<StudioSettingsDto>(this.baseUrl, patch);
    }

    /** POST creazione */
    createSettings(body: StudioSettingsUpdateDto): Observable<StudioSettingsDto> {
        return this.http.post<StudioSettingsDto>(this.baseUrl, body);
    }
}
