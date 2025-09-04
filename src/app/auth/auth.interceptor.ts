// src/app/core/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
    HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

const LS_TOKEN = 'app_token';
const STUDIO_ROLE = 'studio_role';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // evito di allegare il token alla chiamata di login
        const isLogin = req.url.includes('/auth/login');

        const token = localStorage.getItem(LS_TOKEN);
        const role = localStorage.getItem(STUDIO_ROLE);
        const authReq = (!isLogin && token)
            ? req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`,
                    'studio_role': `${role}`,
                }
            })
            : req;

        return next.handle(authReq).pipe(
            catchError((err: HttpErrorResponse) => {
                // opzionale: se 401/403 fai logout o reindirizza
                if (err.status === 401 || err.status === 403) {
                    // e.g., localStorage.removeItem(LS_TOKEN);
                    // window.location.href = '/login';
                }
                return throwError(() => err);
            })
        );
    }
}
