import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreatePatientDto, PatientDto, PatientStatus } from '../model/patient.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class PatientService {
    private readonly baseUrl = `${API_BASE_URL}/patients`;
    private readonly SSN_KEY: 'SSN' | 'ssn' = 'SSN';

    constructor(private http: HttpClient) { }


    findAll(): Observable<PatientDto[]> {
        return this.http.get<PatientDto[]>(this.baseUrl);
    }

    /**
     * Restituisce i pazienti filtrati per stato.
     * - 'active'   -> ?active=true
     * - 'inactive' -> ?active=false
     * - 'all'      -> nessun parametro 'active'
     */
    findAllWithStatus(status: PatientStatus = 'active', q = ''): Observable<PatientDto[]> {
        let params = new HttpParams();

        if (status === 'active') {
            params = params.set('active', 'true');
        } else if (status === 'inactive') {
            params = params.set('active', 'false');
        }
        if (q?.trim()) {
            params = params.set('q', q.trim());
        }

        return this.http.get<PatientDto[]>(this.baseUrl + "/status", { params });
    }
    /** CREATE: prende il form/DTO dal component e lo mappa nel body per l'API */
    create(dto: CreatePatientDto): Observable<PatientDto> {
        const body = this.toApi(dto, { includeSSN: true });  // in create lo mandiamo sempre
        return this.http.post<PatientDto>(this.baseUrl, body);
    }

    /** UPDATE: per default non tocchiamo l'SSN (mandalo solo se vuoi aggiornarlo) */
    update(patientId: string, dto: CreatePatientDto): Observable<PatientDto> {
        const body = this.toApi(dto, { includeSSN: !!dto.SSN }); // invia SSN solo se presente
        return this.http.put<PatientDto>(`${this.baseUrl}/${patientId}`, body);
    }

    remove(patientId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${patientId}`);
    }

    setActive(id: string, status: boolean) {
        const active = status ? 'true' : 'false';
        return this.http.patch<void>(`${this.baseUrl}/${id}/${active}`, null);
    }

    /** Mapper unico: normalizza e applica il casing richiesto dal backend */
    private toApi(dto: CreatePatientDto, opts?: { includeSSN?: boolean }): any {
        // Accetta SSN sia da dto.SSN (maiusc) che da dto['ssn'] (eventuale)
        const ssnRaw = (dto as any).SSN ?? (dto as any).ssn ?? null;
        const ssn = ssnRaw ? String(ssnRaw).trim().toUpperCase() : null;

        const body: any = {
            firstname: dto.firstname,
            lastname: dto.lastname,
            email: dto.email,
            address: dto.address ?? null,
            phone: dto.phone ?? null,
            dateOfBirth: dto.dateOfBirth,
            active: dto.active,
        };

        if (opts?.includeSSN && ssn) {
            body[this.SSN_KEY] = ssn;   // <-- chiave come la vuole il backend
        }

        return body;
    }
}
