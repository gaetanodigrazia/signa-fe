import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

const LS_LOCKED = 'app_locked';
const LS_RETURN_URL = 'app_locked_return_url';
// (facoltativi, adatta alla tua auth reale)
const LS_TOKEN = 'app_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private router: Router) { }

  // === Logout completo ===
  logout(): void {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_LOCKED);
    localStorage.removeItem(LS_RETURN_URL);
    this.router.navigateByUrl('/login');
  }

  // === Blocca schermo senza perdere stato ===
  lock(): void {
    localStorage.setItem(LS_LOCKED, 'true');
    localStorage.setItem(LS_RETURN_URL, this.router.url || '/home');
    this.router.navigateByUrl('/lock');
  }

  // === Sblocco ===
  // Qui potresti verificare password/biometria/SSO ecc.
  // Per ora simuliamo lo sblocco "ok" (integra con la tua logica reale).
  unlockSuccess(): void {
    localStorage.removeItem(LS_LOCKED);
    const returnUrl = localStorage.getItem(LS_RETURN_URL) || '/home';
    localStorage.removeItem(LS_RETURN_URL);
    this.router.navigateByUrl(returnUrl);
  }

  isLocked(): boolean {
    return localStorage.getItem(LS_LOCKED) === 'true';
  }

  // Esempio di "isAuthenticated" (adatta alla tua app)
  isAuthenticated(): boolean {
    return !!localStorage.getItem(LS_TOKEN);
  }
}
