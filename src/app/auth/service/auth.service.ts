// src/app/services/auth.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, Subject, switchMap } from 'rxjs';
import { API_BASE_URL, AUTH_BASE_URL } from 'src/app/config/api.config';
import { PatientService } from 'src/app/service/patient.service';
import { StudioRole } from 'src/app/service/studiomembers.service';
import { LoginSimpleResponse } from '../model/auth.model';

const LS_LOCKED = 'app_locked';
const LS_RETURN_URL = 'app_locked_return_url';
const LS_TOKEN = 'app_token';       // id utente salvato come "token" semplice (tua logica attuale)
const LS_USER_ID = 'app_user_id';
const LS_LAST_ACTIVITY = 'app_last_activity';
const LS_LOGOUT_BROADCAST = 'app_logout_broadcast';
const LS_SESSION_START = 'app_session_start';
const STUDIO_ROLE = 'studio_role';


@Injectable({ providedIn: 'root' })
export class AuthService {
  // Base URL auth
  private readonly baseUrl = `${AUTH_BASE_URL}/auth`;

  // === Auto-logout config ===
  private readonly IDLE_TIMEOUT_MS = 15 * 60_000;  // 15 minuti inattività
  private readonly WARNING_MS = 60_000;       // avviso 60s prima
  // (opzionale) durata massima sessione; 0 = disabilitata
  private readonly MAX_SESSION_MS = 0;

  /** Notifica (ms rimanenti) prima del logout automatico — collegala a un toast/modale se vuoi */
  readonly autoLogoutWarning$ = new Subject<number>();

  private warnTimer: any;
  private logoutTimer: any;
  private started = false;

  private boundActivityHandler = this.onActivity.bind(this);
  private boundStorageHandler = this.onStorage.bind(this);

  constructor(
    private router: Router,
    private http: HttpClient,
    private ngZone: NgZone,
    private patientService: PatientService
  ) {
    // se ricarichi con sessione già attiva, avvia auto-logout
    if (this.isAuthenticated()) {
      this.startAutoLogout();
    }
  }

  /* ======== LOGIN reale ======== */
  login(email: string, password: string): Observable<{ userId: string; studioRole: string }> {
    const body = { email, password };

    return this.http.post<LoginSimpleResponse>(`${this.baseUrl}/login`, body).pipe(
      map(resp => ({
        userId: resp.id,
        studioRole: resp.studioRole
      })),
      tap(({ userId, studioRole }) => {
        // Salvo i dati nel localStorage
        localStorage.setItem(LS_TOKEN, userId);
        localStorage.setItem(STUDIO_ROLE, studioRole);
        localStorage.setItem(LS_USER_ID, userId);

        const now = Date.now();
        localStorage.setItem(LS_SESSION_START, String(now));
        localStorage.setItem(LS_LAST_ACTIVITY, String(now));

        this.startAutoLogout();
      })
    );
  }


  /* ======== Logout ======== */
  logout(): void {
    this.stopAutoLogout();
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER_ID);
    localStorage.removeItem(LS_LOCKED);
    localStorage.removeItem(LS_RETURN_URL);
    localStorage.removeItem(LS_LAST_ACTIVITY);
    localStorage.removeItem(LS_SESSION_START);
    // broadcast alle altre tab
    localStorage.setItem(LS_LOGOUT_BROADCAST, String(Date.now()));
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

  // ====================== AUTO-LOGOUT (inattività + sync tra tab) ======================

  /** Avvia i listener e i timer (idempotente) */
  startAutoLogout() {
    if (this.started) return;
    this.started = true;

    // Listener attività utente
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evt =>
      window.addEventListener(evt, this.boundActivityHandler, { passive: true })
    );

    // Listener storage (logout/attività da altre tab)
    window.addEventListener('storage', this.boundStorageHandler);

    // init session start se mancante
    if (!localStorage.getItem(LS_SESSION_START)) {
      localStorage.setItem(LS_SESSION_START, String(Date.now()));
    }
    if (!localStorage.getItem(LS_LAST_ACTIVITY)) {
      localStorage.setItem(LS_LAST_ACTIVITY, String(Date.now()));
    }

    this.resetTimers();
  }

  /** Ferma listener e timer (idempotente) */
  stopAutoLogout() {
    if (!this.started) return;
    this.started = false;

    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evt =>
      window.removeEventListener(evt, this.boundActivityHandler)
    );
    window.removeEventListener('storage', this.boundStorageHandler);

    this.clearTimers();
  }

  /** Aggiorna attività (throttle ~1s) e resetta timer */
  private onActivity() {
    const now = Date.now();
    const last = Number(localStorage.getItem(LS_LAST_ACTIVITY) || 0);
    if (now - last > 1000) {
      localStorage.setItem(LS_LAST_ACTIVITY, String(now));
      this.resetTimers();
    }
  }

  /** Eventi cross-tab: logout/attività altrove */
  private onStorage(e: StorageEvent) {
    // esci dalla zona per non causare change detection inutili
    this.ngZone.run(() => {
      if (e.key === LS_LOGOUT_BROADCAST && e.newValue) {
        // logout avvenuto in un'altra tab → replica
        this.stopAutoLogout();
        this.router.navigateByUrl('/login');
      } else if (e.key === LS_LAST_ACTIVITY && e.newValue) {
        // attività in un'altra tab → resetta i timer locali
        this.resetTimers();
      }
    });
  }

  /** Calcola il tempo residuo e programma avviso + logout */
  private resetTimers() {
    this.clearTimers();

    const now = Date.now();
    const lastActivity = Number(localStorage.getItem(LS_LAST_ACTIVITY) || now);
    const sessionStart = Number(localStorage.getItem(LS_SESSION_START) || now);

    const idleElapsed = now - lastActivity;
    const idleRemaining = Math.max(this.IDLE_TIMEOUT_MS - idleElapsed, 0);

    const sessionElapsed = now - sessionStart;
    const sessionRemaining = this.MAX_SESSION_MS > 0
      ? Math.max(this.MAX_SESSION_MS - sessionElapsed, 0)
      : Number.POSITIVE_INFINITY;

    const untilLogout = Math.min(idleRemaining, sessionRemaining);
    const warnIn = Math.max(untilLogout - this.WARNING_MS, 0);

    // Avviso (pre-logout)
    this.warnTimer = window.setTimeout(() => {
      this.autoLogoutWarning$.next(Math.min(this.WARNING_MS, untilLogout));
    }, warnIn);

    // Logout effettivo
    this.logoutTimer = window.setTimeout(() => {
      this.logout();
    }, untilLogout);
  }

  private clearTimers() {
    if (this.warnTimer) { clearTimeout(this.warnTimer); this.warnTimer = null; }
    if (this.logoutTimer) { clearTimeout(this.logoutTimer); this.logoutTimer = null; }
  }
}
