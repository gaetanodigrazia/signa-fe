import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppointmentDTO, AppointmentInputDTO, AppointmentStatus } from '../model/appointment.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
    private readonly baseUrl = `${API_BASE_URL}/appointments`;
    constructor(private http: HttpClient) { }

    create(dto: AppointmentInputDTO): Observable<AppointmentDTO> {
        return this.http.post<AppointmentDTO>(this.baseUrl, dto);
    }

    /**
  * Carica gli appuntamenti nel range [from, to]
  * Passa 'ALL' per richiedere tutti gli stati (se il backend lo supporta).
  */
    findAllByDate(
        from: Date,
        to: Date,
    ): Observable<AppointmentDTO[]> {
        const params = new HttpParams()
            .set('from', from.toISOString())
            .set('to', to.toISOString())

        return this.http.get<AppointmentDTO[]>(this.baseUrl + "/calendar", { params });
    }

    /**
     * Carica gli appuntamenti nel range [from, to] e invia SEMPRE lo status.
     * Passa 'ALL' per richiedere tutti gli stati (se il backend lo supporta).
     */
    findAllByDateAndStatus(
        from: Date,
        to: Date,
        status: AppointmentStatus | 'BOOKED'
    ): Observable<AppointmentDTO[]> {
        const params = new HttpParams()
            .set('from', from.toISOString())
            .set('to', to.toISOString())
            .set('status', status); // <-- sempre presente

        return this.http.get<AppointmentDTO[]>(this.baseUrl, { params });
    }

    /** Update completo dell’appuntamento (PUT /{id}) */
    update(appointmentId: string, dto: AppointmentInputDTO): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/${appointmentId}`, dto);
    }

    /** Update solo dello status (PATCH /{id}?status=CONFIRMED) */
    updateStatus(appointmentId: string, status: AppointmentStatus): Observable<void> {
        const params = new HttpParams().set('status', status);
        return this.http.patch<void>(`${this.baseUrl}/${appointmentId}`, null, { params });
    }

    /** Elimina appuntamento */
    delete(appointmentId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${appointmentId}`);
    }
}
