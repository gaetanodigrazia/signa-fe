import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreatePatientDto, PatientDto } from '../model/patient.model';
import { API_BASE_URL } from '../api.config';






@Injectable({ providedIn: 'root' })
export class PatientService {
    private readonly baseUrl = `${API_BASE_URL}/patient`;

    constructor(private http: HttpClient) { }

    findAll(): Observable<PatientDto[]> {
        return this.http.get<PatientDto[]>(this.baseUrl);
    }

    create(dto: CreatePatientDto): Observable<PatientDto> {
        return this.http.post<PatientDto>(this.baseUrl, dto);
    }
}
