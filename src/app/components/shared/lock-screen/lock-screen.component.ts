import { Component } from '@angular/core';
import { AuthService } from 'src/app/auth/service/auth.service';
@Component({
  selector: 'app-lock-screen',
  templateUrl: './lock-screen.component.html',
  styleUrls: ['./lock-screen.component.scss']
})
export class LockScreenComponent {
  password = ''; // opzionale: usa per validare lato client

  constructor(private auth: AuthService) { }

  unlock() {
    // TODO: valida password/SSO se richiesto
    this.auth.unlockSuccess();
  }
}
