import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

const LS_LOCKED = 'app_locked';
const LS_RETURN_URL = 'app_locked_return_url';
const LS_TOKEN = 'app_token';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = 'a';
  password = 'a';
  loading = false;
  error = '';

  constructor(private router: Router) { }

  ngOnInit(): void {
    // se sei già loggato, vai a home
    if (localStorage.getItem(LS_TOKEN)) {
      this.router.navigateByUrl('/home');
    }
  }

  async submit() {
    this.error = '';
    if (!this.email || !this.password) {
      this.error = 'Inserisci email e password.';
      return;
    }

    this.loading = true;
    try {
      // 🔐 TODO: qui collegherai la tua API.
      // Per ora simuliamo un login riuscito:
      await new Promise(r => setTimeout(r, 400));
      localStorage.setItem(LS_TOKEN, 'dummy-token');

      // Se l’app era bloccata, sblocca e torna dove eri
      const wasLocked = localStorage.getItem(LS_LOCKED) === 'true';
      const returnUrl = localStorage.getItem(LS_RETURN_URL) || '/home';

      if (wasLocked) localStorage.removeItem(LS_LOCKED);
      localStorage.removeItem(LS_RETURN_URL);

      this.router.navigateByUrl(returnUrl);
    } catch (e) {
      this.error = 'Credenziali non valide.';
    } finally {
      this.loading = false;
    }
  }
}
