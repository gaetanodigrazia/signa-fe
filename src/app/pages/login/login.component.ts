import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

const LS_TOKEN = 'app_token';
const LS_LOCKED = 'app_locked';
const LS_RETURN_URL = 'app_locked_return_url';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  loading = false;
  error = '';

  private blockPopState = () => {
    // Rimani sul login finché non sei autenticato
    history.pushState(null, document.title, location.href);
  };

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Se già autenticato e non bloccato, vai a home
    const isAuth = !!localStorage.getItem(LS_TOKEN);
    const locked = localStorage.getItem(LS_LOCKED) === 'true';
    if (isAuth && !locked) {
      this.router.navigateByUrl('/home', { replaceUrl: true });
      return;
    }

    // Blocca back/forward mentre sei sul login
    history.pushState(null, document.title, location.href);
    window.addEventListener('popstate', this.blockPopState);
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.blockPopState);
  }

  async submit() {
    this.error = '';
    if (!this.email || !this.password) {
      this.error = 'Inserisci email e password.';
      return;
    }

    this.loading = true;
    try {
      // TODO: sostituisci con la tua API reale
      await new Promise(r => setTimeout(r, 300));
      localStorage.setItem(LS_TOKEN, 'dummy-token');

      // Sblocca se era bloccato
      if (localStorage.getItem(LS_LOCKED) === 'true') {
        localStorage.removeItem(LS_LOCKED);
      }

      const returnUrl = localStorage.getItem(LS_RETURN_URL) || '/home';
      localStorage.removeItem(LS_RETURN_URL);

      // Vai alla pagina prevista e sostituisci la history (niente back)
      this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    } catch {
      this.error = 'Credenziali non valide.';
    } finally {
      this.loading = false;
    }
  }
}
