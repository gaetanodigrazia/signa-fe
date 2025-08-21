// src/app/app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from './auth/service/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  showShell = true; // sidebar + layout
  bootLoading = true; // <-- spinner di bootstrap

  private warnSub?: Subscription;
  private bootSub?: Subscription;

  constructor(
    private router: Router,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
    // Spinner + probe
    this.bootSub = this.auth.probeLogin()
      .pipe(finalize(() => { this.bootLoading = false; }))
      .subscribe({
        next: () => {
          // opzionale: gestisci risposta OK
        },
        error: (err) => {
          // opzionale: log/gestione errore
          console.warn('Probe login failed:', err);
        }
      });

    // Routing: mostra/nascondi shell
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url.split('?')[0];
        this.showShell = !(url === '/login' || url.startsWith('/login/'));
      });

    // Avviso auto-logout
    this.warnSub = this.auth.autoLogoutWarning$.subscribe(msLeft => {
      console.warn(`Logout automatico tra ${Math.ceil(msLeft / 1000)}s`);
    });
  }

  ngOnDestroy(): void {
    this.warnSub?.unsubscribe();
    this.bootSub?.unsubscribe();
  }

  onSidebarCollapseChange(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }
}
