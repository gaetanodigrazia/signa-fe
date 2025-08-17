import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorModalService, AppError } from '../service/error-modal.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private readonly modal: ErrorModalService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    console.warn('[ErrorInterceptor] Catturato', err); // <--- DEBUG
                    const payload = err.error ?? {};
                    const normalized: AppError = {
                        status: err.status,
                        title: payload.title || (err.status === 403 ? 'Permesso negato' : err.statusText || 'Errore'),
                        detail: payload.detail || payload.message || err.message || 'Si è verificato un errore inatteso.',
                        type: payload.type,
                        instance: payload.instance,
                    };
                    if (err.status >= 400) this.modal.open(normalized);
                }
                return throwError(() => err);
            })
        );
    }
}
