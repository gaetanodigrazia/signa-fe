import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingDialogService {
    // Stato pubblico dell’overlay (true/false)
    readonly loading$ = new BehaviorSubject<boolean>(false);

    // Contatore per gestire richieste concorrenti
    private refCount = 0;

    openDialog(): void {
        this.refCount++;
        if (this.refCount === 1) {
            this.loading$.next(true);
        }
    }

    hideDialog(): void {
        this.refCount = Math.max(0, this.refCount - 1);
        if (this.refCount === 0) {
            this.loading$.next(false);
        }
    }

    reset(): void {
        this.refCount = 0;
        this.loading$.next(false);
    }
}
