// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { API_BASE_URL } from 'src/app/api.config';

const LS_LOCKED = 'app_locked';
const LS_RETURN_URL = 'app_locked_return_url';
const LS_TOKEN = 'app_token';          // lo usiamo per salvare l'id utente
const LS_USER_ID = 'app_user_id';      // alias esplicito, se preferisci

export interface LoginSimpleResponse { id: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Se usi environments, sostituisci con environment.apiBaseUrl + '/auth'
  private readonly baseUrl = `${API_BASE_URL}/auth`;

  constructor(private router: Router, private http: HttpClient) { }

  /* ======== LOGIN reale ======== */
  login(email: string, password: string): Observable<string> {
    const params = new HttpParams().set('email', email).set('password', password);
    // Il backend accetta @RequestParam, quindi POST con parametri in query e body nullo
    return this.http.post<LoginSimpleResponse>(`${this.baseUrl}/login`, null, { params }).pipe(
      map(resp => resp.id),
      tap(userId => {
        // Salvo l'id come “token” semplice per la tua logica attuale
        localStorage.setItem(LS_TOKEN, userId);
        localStorage.setItem(LS_USER_ID, userId);
      })
    );
  }

  /* ======== Logout ======== */
  logout(): void {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER_ID);
    localStorage.removeItem(LS_LOCKED);
    localStorage.removeItem(LS_RETURN_URL);
    this.router.navigateByUrl('/login');
  }

  /* ======== Lock / Unlock ======== */
  lock(): void {
    localStorage.setItem(LS_LOCKED, 'true');
    localStorage.setItem(LS_RETURN_URL, this.router.url || '/home');
    this.router.navigateByUrl('/lock');
  }

  unlockSuccess(): void {
    localStorage.removeItem(LS_LOCKED);
    const returnUrl = localStorage.getItem(LS_RETURN_URL) || '/home';
    localStorage.removeItem(LS_RETURN_URL);
    this.router.navigateByUrl(returnUrl);
  }

  isLocked(): boolean {
    return localStorage.getItem(LS_LOCKED) === 'true';
  }

  /* ======== Stato auth ======== */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(LS_TOKEN);
  }

  getUserId(): string | null {
    return localStorage.getItem(LS_USER_ID);
  }
}
