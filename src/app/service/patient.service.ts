import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreatePatientDto, PatientDto, PatientStatus } from '../model/patient.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class PatientService {
    private readonly baseUrl = `${API_BASE_URL}/patients`;

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
    create(dto: CreatePatientDto): Observable<PatientDto> {
        return this.http.post<PatientDto>(this.baseUrl, dto);
    }
    update(patientId: string, dto: CreatePatientDto): Observable<PatientDto> {
        // Adattiamo le chiavi al PatientInputDTO del backend
        const body = {
            firstname: dto.firstname,
            lastname: dto.lastname,
            email: dto.email,
            address: dto.address,
            ssn: dto.SSN,          // <-- ssn minuscolo per il backend
            dateOfBirth: dto.dateOfBirth   // formato ISO yyyy-MM-dd va bene
        };
        return this.http.put<PatientDto>(`${this.baseUrl}/${patientId}`, body);
    }


    remove(patientId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${patientId}`);
    }
}
