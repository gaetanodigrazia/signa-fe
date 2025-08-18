import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PatientService } from './patient.service';
import { CreatePatientDto, PatientDto } from '../model/patient.model';

@Injectable({ providedIn: 'root' })
export class PatientsFacade {
    private readonly _items$ = new BehaviorSubject<PatientDto[]>([]);
    private loaded = false;

    constructor(private api: PatientService) { }

    /** Stream pazienti */
    get items$(): Observable<PatientDto[]> {
        if (!this.loaded) this.ensureLoaded();
        return this._items$.asObservable();
    }

    /** Carica una sola volta (cache in memoria) */
    ensureLoaded(): void {
        if (this.loaded) return;
        this.loaded = true;
        this.api.findAll().subscribe({
            next: (items) => this._items$.next(items ?? []),
            error: () => this._items$.next([]),
        });
    }

    /** Ricarica forzata */
    refresh(): void {
        this.api.findAll().subscribe({
            next: (items) => this._items$.next(items ?? []),
            error: () => this._items$.next([]),
        });
    }

    /** Crea e aggiorna la cache */
    create(dto: CreatePatientDto): Observable<PatientDto> {
        return this.api.create(dto).pipe(
            tap((created) => {
                const curr = this._items$.value ?? [];
                this._items$.next([created, ...curr]);
            })
        );
    }

    /** Lookup sincrono da cache */
    findByIdSync(id: string | null | undefined): PatientDto | undefined {
        if (!id) return undefined;
        return this._items$.value?.find(p => p.id === id);
    }
}
