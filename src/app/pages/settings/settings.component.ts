import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms'; // per [(ngModel)] nella modale 2FA
import { Subject, Observable } from 'rxjs';          // <— NEW
import { BehaviorSubject } from 'rxjs';

type TabKey =
  | 'profile' | 'notifications' | 'agenda'
  | 'clinic' | 'privacy' | 'security' | 'integrations';

type ToggleKey =
  | 'notifyEmail' | 'patientReminders'
  | 'gdprConsentRequired' | 'allowPatientPortal'
  | 'enableAutoLogout'    // sicurezza
  | 'googleSync' | 'outlookSync';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

export class SettingsComponent {
  saving = false;
  showLeaveModal = false;
  private leaveResolve?: (result: boolean) => void;

  private leaveDecision$ = new BehaviorSubject<boolean | null>(null);
  confirmLeave$ = this.leaveDecision$.asObservable();

  // opzioni per il timeout (puoi cambiare a piacere)
  autoLogoutOptions = [5, 10, 15, 20, 30, 45, 60, 90, 120];
  tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'profile', label: 'Profilo', icon: '👤' },
    { key: 'notifications', label: 'Notifiche', icon: '🔔' },
    { key: 'agenda', label: 'Agenda', icon: '📅' },
    { key: 'clinic', label: 'Studio', icon: '🏥' },
    { key: 'privacy', label: 'Privacy', icon: '🔏' },
    { key: 'security', label: 'Sicurezza', icon: '🛡️' },
    { key: 'integrations', label: 'Integrazioni', icon: '🔌' },
  ];
  currentTab: TabKey = 'profile';
  indicatorTransform = 'translateX(0)';

  tabFields: Record<TabKey, string[]> = {
    profile: ['firstName', 'lastName', 'title', 'email', 'locale', 'timeFormat'],
    notifications: ['notifyEmail', 'patientReminders', 'emailSignature'],
    agenda: ['slotDuration', 'slotBuffer', 'workingDays'],
    clinic: ['clinicName', 'clinicPhone', 'clinicAddress', 'vatId', 'iban', 'payments'],
    privacy: ['gdprConsentRequired', 'allowPatientPortal'],
    security: ['enable2fa', 'enableAutoLogout', 'autoLogoutMinutes'],
    integrations: ['googleSync', 'outlookSync'],
  };

  isTabDirty(tab: TabKey): boolean {
    const controls = this.tabFields[tab];
    return controls.some(f => this.form.get(f)?.dirty);
  }

  days = [
    { value: '1', label: 'Lunedì' },
    { value: '2', label: 'Martedì' },
    { value: '3', label: 'Mercoledì' },
    { value: '4', label: 'Giovedì' },
    { value: '5', label: 'Venerdì' },
    { value: '6', label: 'Sabato' },
    { value: '0', label: 'Domenica' },
  ];

  form = this.fb.group({
    // Profilo
    firstName: [''],
    lastName: [''],
    title: [''],
    email: ['', [Validators.email]],
    locale: ['it-IT'],
    timeFormat: ['24h'],

    // Notifiche
    notifyEmail: [true],
    patientReminders: [true],
    emailSignature: [''],

    // Agenda
    slotDuration: ['30'],
    slotBuffer: ['5'],
    workingDays: this.fb.control<string[] | null>(['1', '2', '3', '4', '5']),

    // Studio/Fatturazione
    clinicName: [''],
    clinicPhone: [''],
    clinicAddress: [''],
    vatId: [''],
    iban: [''],
    payments: this.fb.control<string[] | null>(['card', 'cash']),

    // Privacy
    gdprConsentRequired: [true],
    allowPatientPortal: [false],

    // Sicurezza
    enable2fa: [false],          // gestita via modale
    enableAutoLogout: [true],    // nuovo toggle
    autoLogoutMinutes: [15],          // <— NUOVO: tempo di inattività

    // Integrazioni
    googleSync: [false],
    outlookSync: [false],
  });

  // Modale conferma per disabilitazioni
  confirm = {
    state: false,
    key: null as ToggleKey | null,
    label: ''
  };

  // Modale 2FA (configurazione)
  twofa = {
    open: false,
    method: 'sms' as 'sms' | 'email',
    phone: '',
    email: ''
  };
  pendingChanges = false;
  private leaveDecision: ((res: boolean) => void) | null = null;

  constructor(private fb: FormBuilder) {
    this.form.valueChanges.subscribe(() => {
      this.pendingChanges = this.form.dirty;
    });
  }
  /* ---------- Tabs ---------- */
  setTab(key: TabKey) {
    this.currentTab = key;
    const idx = this.tabs.findIndex(t => t.key === key);
    this.indicatorTransform = `translateX(${idx * 100}%)`;
  }

  @HostListener('window:resize') onResize() {
    const idx = this.tabs.findIndex(t => t.key === this.currentTab);
    this.indicatorTransform = `translateX(${idx * 100}%)`;
  }

  /* ---------- Azioni pagina ---------- */
  reset() { this.form.reset(this.form.getRawValue()); }

  async save() {
    if (this.form.invalid) return;
    this.saving = true;
    try {
      // TODO: chiama API di salvataggio con this.form.value
      // await this.api.saveSettings(this.form.value).toPromise();
    } finally {
      this.saving = false;
      this.form.markAsPristine();
    }
  }

  changePassword() { alert('Funzione cambio password da implementare'); }
  downloadActivityLog() { alert('Download log attività…'); }

  /* ---------- Toggle generici (bottoni verde/rosso) ---------- */
  onToggle(key: ToggleKey) {
    const current = !!this.form.get(key)?.value;
    // Se stiamo passando da ON -> OFF, chiedi conferma
    if (current) {
      this.confirm.state = true;
      this.confirm.key = key;
      this.confirm.label = this.labelFor(key);
      return;
    }
    // Se stiamo passando da OFF -> ON, abilita subito
    this.applyToggle(key, true);
  }

  private applyToggle(key: ToggleKey, next: boolean) {
    this.form.get(key)?.setValue(next);
    // TODO: chiamata ottimistica al backend, con eventuale rollback
    // this.api.updateToggle(key, next).subscribe({
    //   error: () => this.form.get(key)?.setValue(!next)
    // });
  }

  confirmDisable() {
    if (!this.confirm.key) return;
    this.applyToggle(this.confirm.key, false);
    this.closeConfirm();
  }
  closeConfirm() { this.confirm = { state: false, key: null, label: '' }; }

  private labelFor(key: ToggleKey): string {
    switch (key) {
      case 'notifyEmail': return 'Notifiche email personali';
      case 'patientReminders': return 'Promemoria ai pazienti';
      case 'gdprConsentRequired': return 'Consenso privacy';
      case 'allowPatientPortal': return 'Portale paziente';
      case 'enableAutoLogout': return 'Logout automatico';
      case 'googleSync': return 'Google Calendar';
      case 'outlookSync': return 'Outlook Calendar';
    }
  }

  /* ---------- 2FA ---------- */
  openTwofaModal() {
    // opzionale: pre-carica dati dal backend qui
    this.twofa.open = true;
  }

  closeTwofa() {
    this.twofa.open = false;
  }

  saveTwofa() {
    if (this.twofa.method === 'sms' && !this.twofa.phone) {
      alert('Inserisci un numero di telefono.');
      return;
    }
    if (this.twofa.method === 'email' && !this.twofa.email) {
      alert('Inserisci un indirizzo email.');
      return;
    }
    // TODO: chiama API per salvare le preferenze 2FA
    // this.api.saveTwofa(this.twofa).subscribe({
    //   next: () => {
    this.form.get('enable2fa')?.setValue(true);
    this.twofa.open = false;
    //   },
    //   error: () => { /* mostra errore */ }
    // });
  }


  canDeactivate(): Promise<boolean> | boolean {
    if (!this.form.dirty) return true;
    this.showLeaveModal = true;
    return new Promise<boolean>(resolve => {
      this.leaveResolve = resolve;
    });
  }

  onLeaveConfirm() {
    this.showLeaveModal = false;
    this.leaveResolve?.(true);
    this.leaveResolve = undefined;
  }

  onLeaveCancel() {
    this.showLeaveModal = false;
    this.leaveResolve?.(false);
    this.leaveResolve = undefined;
  }
}