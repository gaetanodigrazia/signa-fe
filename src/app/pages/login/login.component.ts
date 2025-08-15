// src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/service/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  constructor(private auth: AuthService, private router: Router) { }

  submit(): void {
    if (this.loading) return;
    this.error = null;
    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: (userId) => {
        this.loading = false;
        // naviga dove preferisci dopo il login
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.status === 401 ? 'Credenziali non valide' : 'Errore di connessione';
      },
    });
  }
}
