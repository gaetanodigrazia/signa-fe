import { ErrorHandler, Injectable, NgModule } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    constructor(private snackBar: MatSnackBar) { }

    handleError(error: unknown): void {
        // Log di debug per sviluppatori
        console.error('Global Error:', error);

        let message = 'Si è verificato un errore inatteso.';
        if (error instanceof HttpErrorResponse) {
            if (!navigator.onLine) {
                message = 'Sembra che tu sia offline. Controlla la connessione.';
            } else {
                const status = error.status || '—';
                message = `Errore di rete (${status}). Riprova più tardi.`;
            }
        } else if (error instanceof Error && error.message) {
            message = error.message;
        }

        this.snackBar.open(message, 'Chiudi', { duration: 5000 });
    }
}

@NgModule({
    providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }],
    imports: [MatSnackBarModule],
})
export class GlobalErrorHandlerModule { }
