import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { Observable } from 'rxjs';
import {
    StudioMemberProfileUpdateDto,
    StudioMemberSettingsDto,
} from '../model/settings-user.model';

@Injectable({ providedIn: 'root' })
export class SettingsUserService {
    private readonly baseUrl = `${API_BASE_URL}/members/settings`; // adatta se il tuo controller espone un path diverso

    constructor(private http: HttpClient) { }

    /** GET corrente: può tornare 200 con body o 404 se inesistente */
    getMySettings(): Observable<StudioMemberSettingsDto | null> {
        return this.http.get<StudioMemberSettingsDto | null>(this.baseUrl);
    }

    /** POST crea impostazioni/profilo */
    createSettings(body: StudioMemberProfileUpdateDto): Observable<StudioMemberSettingsDto | null> {
        return this.http.post<StudioMemberSettingsDto | null>(this.baseUrl, body);
    }

    /** PATCH aggiorna impostazioni/profilo */
    updateSettings(body: StudioMemberProfileUpdateDto): Observable<StudioMemberSettingsDto | null> {
        return this.http.patch<StudioMemberSettingsDto | null>(this.baseUrl, body);
    }
}
