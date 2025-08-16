import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Appointment } from '../model/appointment.model';
import { v4 as uuidv4 } from 'uuid';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class AppointmentService {
    private baseUrl = `${API_BASE_URL}/appointment`;

    private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
    public appointments$: Observable<Appointment[]> = this.appointmentsSubject.asObservable();

    constructor() {
        const stored = localStorage.getItem('appointments');
        if (stored) {
            this.appointmentsSubject.next(JSON.parse(stored).map((a: any) => ({
                ...a,
                start: new Date(a.start),
                end: a.end ? new Date(a.end) : undefined,
                createdAt: new Date(a.createdAt),
                updatedAt: a.updatedAt ? new Date(a.updatedAt) : undefined
            })));
        }
    }

    private saveToStorage() {
        localStorage.setItem('appointments', JSON.stringify(this.appointmentsSubject.value));
    }

    getAll(): Appointment[] {
        return this.appointmentsSubject.value;
    }

    getById(id: string): Appointment | undefined {
        return this.appointmentsSubject.value.find(a => a.id === id);
    }

    create(data: Omit<Appointment, 'id' | 'createdAt'>) {
        const newAppointment: Appointment = {
            id: uuidv4(),
            createdAt: new Date(),
            ...data
        };
        const updated = [...this.appointmentsSubject.value, newAppointment];
        this.appointmentsSubject.next(updated);
        this.saveToStorage();
        return newAppointment;
    }

    update(id: string, changes: Partial<Appointment>) {
        const updated = this.appointmentsSubject.value.map(a =>
            a.id === id ? { ...a, ...changes, updatedAt: new Date() } : a
        );
        this.appointmentsSubject.next(updated);
        this.saveToStorage();
    }

    delete(id: string) {
        const updated = this.appointmentsSubject.value.filter(a => a.id !== id);
        this.appointmentsSubject.next(updated);
        this.saveToStorage();
    }
}
