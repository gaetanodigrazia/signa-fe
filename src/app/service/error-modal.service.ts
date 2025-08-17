import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Modello normalizzato dell'errore
export interface AppError {
    status?: number;
    title?: string;
    detail?: string;
    type?: string;
    instance?: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorModalService {
    private readonly _state$ = new BehaviorSubject<AppError | null>(null);
    readonly state$ = this._state$.asObservable();

    open(err: AppError) {
        this._state$.next(err);
    }

    close() {
        this._state$.next(null);
    }
}
