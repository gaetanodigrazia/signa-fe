// src/app/service/archive.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { PatientDto } from '../model/patient.model';
import { PatientService } from './patient.service';
import { AppointmentDTO, AppointmentHistoryDTO } from '../model/appointment.model';

export interface PatientHistoryItem {
    date: string;
    description: string;
    studioName?: string;
    doctorName?: string;
}

@Injectable({ providedIn: 'root' })
export class ArchiveService {
    private readonly patientsUrl = `${API_BASE_URL}/patient`;
    private readonly historyUrl = `${API_BASE_URL}/appointments/history`;

    constructor(private http: HttpClient, private patientSvc: PatientService) { }

    listPatients(): Observable<PatientDto[]> {
        return this.patientSvc.findAll();
    }

    getHistory(patientId: string): Observable<AppointmentHistoryDTO[]> {
        return this.http.get<AppointmentHistoryDTO[]>(this.historyUrl + "/" + patientId);
    }
}
