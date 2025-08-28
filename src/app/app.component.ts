// src/app/app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from './auth/service/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  bootLoading = true;

  private warnSub?: Subscription;
  private bootSub?: Subscription;

  // NOTA: 'public' per poter usare 'auth' nel template
  constructor(public auth: AuthService) { }

  ngOnInit(): void {
    // (Opzionale) avviso auto-logout se lo usi
    this.warnSub = this.auth.autoLogoutWarning$?.subscribe(msLeft => {
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
