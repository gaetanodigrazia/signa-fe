// error.interceptor.ts
import { inject, Injectable } from '@angular/core';
import {
    HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse,
    HttpContextToken, HttpInterceptorFn
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorModalService, AppError } from '../service/error-modal.service';

// Possibilità di sopprimere la modale su richieste specifiche
export const SUPPRESS_ERROR_MODAL = new HttpContextToken<boolean>(() => false);

// --- Classe (per registrazione classica) ---
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private readonly modal: ErrorModalService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const suppress = req.context.get(SUPPRESS_ERROR_MODAL);

        return next.handle(req).pipe(
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    const normalized = normalizeHttpError(err);
                    if (!suppress && (err.status >= 400 || err.status === 0)) {
                        this.modal.open(normalized);
                    }
                }
                return throwError(() => err);
            })
        );
    }
}

// --- Funzione (per API standalone) ---
export const errorInterceptorFn: HttpInterceptorFn = (req, next) => {
    const modal = inject(ErrorModalService);
    const suppress = req.context.get(SUPPRESS_ERROR_MODAL);

    return next(req).pipe(
        catchError((err: unknown) => {
            if (err instanceof HttpErrorResponse) {
                const normalized = normalizeHttpError(err);
                if (!suppress && (err.status >= 400 || err.status === 0)) {
                    modal.open(normalized);
                }
            }
            return throwError(() => err);
        })
    );
};

// ===== Helpers =====

function normalizeHttpError(err: HttpErrorResponse): AppError {
    // 0 = offline / CORS / network
    if (err.status === 0) {
        return {
            status: 0,
            title: 'Connessione assente',
            detail: 'Impossibile contattare il server. Controlla la connessione di rete.',
        };
    }

    // Payload “parsabile”
    const payload = extractPayload(err);

    // RFC 7807 (ProblemDetail) mapping: title/detail/type/instance
    const title =
        payload.title ||
        friendlyTitle(err.status, err.statusText);

    const detail =
        payload.detail || // RFC 7807
        payload.message ||
        firstModelStateError(payload) ||
        'Si è verificato un errore inatteso.';

    return {
        status: err.status,
        title,
        detail,
        type: payload.type,        // RFC 7807
        instance: payload.instance // RFC 7807
    };
}

function extractPayload(err: HttpErrorResponse): any {
    const e = err.error;
    if (!e) return {};
    if (typeof e === 'string') {
        try { return JSON.parse(e); } catch { return { message: e }; }
    }
    if (e instanceof ArrayBuffer) {
        try { return JSON.parse(new TextDecoder().decode(e)); } catch { return {}; }
    }
    if (e instanceof Blob) {
        // Non leggibile sincrono: inseriamo un messaggio generico
        return { message: err.message || 'Errore' };
    }
    return e; // oggetto già JSON (es. ProblemDetail Spring)
}

function firstModelStateError(payload: any): string | null {
    // Supporto errori stile ASP.NET: { errors: { field: [..] } }
    const errors = payload?.errors;
    if (errors && typeof errors === 'object') {
        const k = Object.keys(errors)[0];
        const v = (errors as any)[k];
        if (Array.isArray(v) && v.length) return v[0];
        if (typeof v === 'string') return v;
    }
    return null;
}

function friendlyTitle(status: number, fallback?: string): string {
    const map: Record<number, string> = {
        400: 'Richiesta non valida',
        401: 'Utente non autorizzato',
        403: 'Permesso negato',
        404: 'Risorsa non trovata',
        409: 'Conflitto',
        422: 'Dati non validi',
        500: 'Errore interno del server',
        503: 'Servizio non disponibile',
    };
    return map[status] || fallback || 'Errore';
}
