import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
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

  private warnSub?: Subscription; // <-- aggiunta

  constructor(
    private router: Router,
    private auth: AuthService         // <-- aggiunta
  ) { }

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url.split('?')[0];
        // Nascondi shell SOLO su /login (puoi aggiungere anche /lock se vuoi)
        this.showShell = !(url === '/login' || url.startsWith('/login/'));
      });

    // Avviso prima dell'auto-logout (mostra un toast/modale qui)
    this.warnSub = this.auth.autoLogoutWarning$.subscribe(msLeft => {
      // TODO: sostituisci con il tuo servizio toast/modal
      console.warn(`Logout automatico tra ${Math.ceil(msLeft / 1000)}s`);
    });
  }

  ngOnDestroy(): void {
    this.warnSub?.unsubscribe();
  }

  onSidebarCollapseChange(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }
}
