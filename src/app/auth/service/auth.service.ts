// src/app/services/auth.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, Subject } from 'rxjs';
import { AUTH_BASE_URL } from 'src/app/config/api.config';
import { PatientService } from 'src/app/service/patient.service';
import { LoggedUserDto, LoginSimpleResponse } from '../model/auth.model';
import { LoggedUserStore } from './logged-user.store';

const LS_LOCKED = 'app_locked';
const LS_RETURN_URL = 'app_locked_return_url';
const LS_TOKEN = 'app_token';       // id utente salvato come "token" attualmente
const LS_USER_ID = 'app_user_id';
const LS_LAST_ACTIVITY = 'app_last_activity';
const LS_LOGOUT_BROADCAST = 'app_logout_broadcast';
const LS_SESSION_START = 'app_session_start';
const STUDIO_ROLE = 'studio_role';
const LOGGED_USER = 'logged_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${AUTH_BASE_URL}/auth`;

  // === Default di fallback ===
  private readonly DEFAULT_IDLE_TIMEOUT_MS = 15 * 60_000;  // 15 minuti
  private readonly DEFAULT_WARNING_MS = 60_000;            // avviso 60s prima
  private readonly MAX_SESSION_MS = 0;                     // disabilitato

  // === Valori effettivi (configurati post-login) ===
  private effectiveIdleMs = this.DEFAULT_IDLE_TIMEOUT_MS;
  private effectiveWarnMs = this.DEFAULT_WARNING_MS;
  private autoLogoutEnabled = true;

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
    private patientService: PatientService,
    private loggedUserStore: LoggedUserStore
  ) {
    if (this.isAuthenticated()) {
      this.startAutoLogout();
    }
  }

  // === Configurazione post-login in base a userSettings ===
  private configureAutoLogoutFromSettings(user: LoggedUserDto) {
    const us = user?.userSettings;
    if (!us) {
      this.autoLogoutEnabled = true;
      this.effectiveIdleMs = this.DEFAULT_IDLE_TIMEOUT_MS;
      this.effectiveWarnMs = this.DEFAULT_WARNING_MS;
      return;
    }

    this.autoLogoutEnabled = us.enableAutoLogout !== false; // default: abilitato
    const mins = Number(us.autoLogoutMinutes);
    this.effectiveIdleMs = Number.isFinite(mins) && mins > 0 ? mins * 60_000 : this.DEFAULT_IDLE_TIMEOUT_MS;

    const tenPercent = Math.floor(this.effectiveIdleMs * 0.1);
    this.effectiveWarnMs = Math.max(Math.min(this.DEFAULT_WARNING_MS, tenPercent || this.DEFAULT_WARNING_MS), 5_000);
  }
  login(email: string, password: string): Observable<{ userId: string; studioRole: string; loggedUserDto: LoggedUserDto }> {
    const body = { email, password };

    return this.http.post<LoginSimpleResponse>(`${this.baseUrl}/login`, body).pipe(
      map(resp => ({
        userId: resp.id,
        studioRole: resp.studioRole,
        loggedUserDto: resp.loggedUserDto
      })),
      tap(({ userId, studioRole, loggedUserDto }) => {
        // ✅ mantieni solo metadati necessari al resto del servizio
        localStorage.setItem(LS_TOKEN, userId);
        localStorage.setItem(STUDIO_ROLE, studioRole);
        localStorage.setItem(LS_USER_ID, userId);

        // ❌ NON salviamo più l'intero loggedUser nel localStorage
        // localStorage.setItem(LOGGED_USER, JSON.stringify(loggedUserDto));

        // ✅ condividi loggedUser (incluse userSettings) in memoria per tutta l'app
        this.loggedUserStore.setLoggedUser(loggedUserDto);

        // inizializza contatori locali (per l'auto-logout già esistente)
        const now = Date.now();
        localStorage.setItem(LS_SESSION_START, String(now));
        localStorage.setItem(LS_LAST_ACTIVITY, String(now));

        this.configureAutoLogoutFromSettings(loggedUserDto);
        if (this.autoLogoutEnabled) {
          this.startAutoLogout();
        } else {
          this.stopAutoLogout();
        }
      })
    );
  }

  /* ======== Logout ======== */
  logout(): void {
    this.stopAutoLogout();
    this.loggedUserStore.clear();

    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER_ID);
    localStorage.removeItem(LS_LOCKED);
    localStorage.removeItem(LS_RETURN_URL);
    localStorage.removeItem(LS_LAST_ACTIVITY);
    localStorage.removeItem(LS_SESSION_START);
    localStorage.setItem(LS_LOGOUT_BROADCAST, String(Date.now())); // broadcast alle altre tab
    this.router.navigateByUrl('/login');
  }


  isAuthenticated(): boolean {
    return !!localStorage.getItem(LS_TOKEN);
  }

  getUserId(): string | null {
    return localStorage.getItem(LS_USER_ID);
  }

  // ====================== AUTO-LOGOUT (inattività + sync tra tab) ======================

  startAutoLogout() {
    if (this.started || !this.autoLogoutEnabled) return;
    this.started = true;

    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evt =>
      window.addEventListener(evt, this.boundActivityHandler, { passive: true })
    );

    window.addEventListener('storage', this.boundStorageHandler);

    if (!localStorage.getItem(LS_SESSION_START)) {
      localStorage.setItem(LS_SESSION_START, String(Date.now()));
    }
    if (!localStorage.getItem(LS_LAST_ACTIVITY)) {
      localStorage.setItem(LS_LAST_ACTIVITY, String(Date.now()));
    }

    this.resetTimers();
  }

  stopAutoLogout() {
    if (!this.started) return;
    this.started = false;

    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evt =>
      window.removeEventListener(evt, this.boundActivityHandler)
    );
    window.removeEventListener('storage', this.boundStorageHandler);

    this.clearTimers();
  }

  private onActivity() {
    if (!this.autoLogoutEnabled) return;
    const now = Date.now();
    const last = Number(localStorage.getItem(LS_LAST_ACTIVITY) || 0);
    if (now - last > 1000) {
      localStorage.setItem(LS_LAST_ACTIVITY, String(now));
      this.resetTimers();
    }
  }

  private onStorage(e: StorageEvent) {
    this.ngZone.run(() => {
      if (e.key === LS_LOGOUT_BROADCAST && e.newValue) {
        this.stopAutoLogout();
        this.router.navigateByUrl('/login');
      } else if (e.key === LS_LAST_ACTIVITY && e.newValue && this.autoLogoutEnabled) {
        this.resetTimers();
      }
    });
  }

  private resetTimers() {
    this.clearTimers();
    if (!this.autoLogoutEnabled) return;

    const now = Date.now();
    const lastActivity = Number(localStorage.getItem(LS_LAST_ACTIVITY) || now);
    const sessionStart = Number(localStorage.getItem(LS_SESSION_START) || now);

    const idleElapsed = now - lastActivity;
    const idleRemaining = Math.max(this.effectiveIdleMs - idleElapsed, 0);

    const sessionElapsed = now - sessionStart;
    const sessionRemaining = this.MAX_SESSION_MS > 0
      ? Math.max(this.MAX_SESSION_MS - sessionElapsed, 0)
      : Number.POSITIVE_INFINITY;

    const untilLogout = Math.min(idleRemaining, sessionRemaining);
    const warnIn = Math.max(untilLogout - this.effectiveWarnMs, 0);

    this.warnTimer = window.setTimeout(() => {
      this.autoLogoutWarning$.next(Math.min(this.effectiveWarnMs, untilLogout));
    }, warnIn);

    this.logoutTimer = window.setTimeout(() => {
      this.logout();
    }, untilLogout);
  }

  private clearTimers() {
    if (this.warnTimer) { clearTimeout(this.warnTimer); this.warnTimer = null; }
    if (this.logoutTimer) { clearTimeout(this.logoutTimer); this.logoutTimer = null; }
  }
}
