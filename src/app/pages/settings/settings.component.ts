import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms'; // per [(ngModel)] nella modale 2FA

type TabKey =
  | 'profile' | 'digitale' | 'agenda'
  | 'clinic' | 'security' | 'integrations';

type ToggleKey =
  | 'patientReminders'
  | 'allowPatientPortal'
  | 'enableAutoLogout';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  saving = false;

  // Modale conferma uscita
  showLeaveModal = false;
  private leaveResolve?: (result: boolean) => void;

  // Timeout di logout automatico
  autoLogoutOptions = [5, 10, 15, 20, 30, 45, 60, 90, 120];
  ngOnInit() {
    // ...tuo codice...
    setTimeout(() => {
      if (typeof window.onbeforeunload === 'function') {
        console.warn('[Settings] Rilevato window.onbeforeunload attivo: questo provoca l’alert nativo.');
      }
    });
  }
  tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'profile', label: 'Profilo', icon: '👤' },
    { key: 'digitale', label: 'Digitale', icon: '🖥️' },
    { key: 'agenda', label: 'Agenda', icon: '📅' },
    { key: 'clinic', label: 'Studio', icon: '🏥' },
    { key: 'security', label: 'Sicurezza', icon: '🛡️' },
  ];
  currentTab: TabKey = 'profile';
  indicatorTransform = 'translateX(0)';

  tabFields: Record<TabKey, string[]> = {
    profile: ['firstName', 'lastName', 'title', 'email', 'locale', 'timeFormat'],
    digitale: ['patientReminders', 'emailSignature', 'allowPatientPortal'],
    agenda: ['slotDuration', 'slotBuffer', 'workingDays'],
    clinic: ['clinicName', 'clinicPhone', 'clinicAddress', 'vatId', 'iban',],
    security: ['enable2fa', 'enableAutoLogout', 'autoLogoutMinutes'],
    integrations: ['googleSync', 'outlookSync'],
  };

  isTabDirty(tab: TabKey): boolean {
    return this.tabFields[tab].some(f => this.form.get(f)?.dirty);
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
    allowPatientPortal: [false],

    // Sicurezza
    enable2fa: [false],
    enableAutoLogout: [true],
    autoLogoutMinutes: [15]

  });

  // Modale conferma per disabilitazioni
  confirm = {
    state: false,
    key: null as ToggleKey | null,
    label: ''
  };

  // Modale 2FA
  twofa = {
    open: false,
    method: 'sms' as 'sms' | 'email',
    phone: '',
    email: ''
  };

  constructor(private fb: FormBuilder) { }

  /* ---------- Tabs ---------- */
  setTab(key: TabKey) {
    this.currentTab = key;
    const idx = this.tabs.findIndex(t => t.key === key);
    this.indicatorTransform = `translateX(${idx * 100}%)`;
  }

  @HostListener('window:resize')
  onResize() {
    const idx = this.tabs.findIndex(t => t.key === this.currentTab);
    this.indicatorTransform = `translateX(${idx * 100}%)`;
  }

  /* ---------- Azioni pagina ---------- */
  reset() { this.form.reset(this.form.getRawValue()); }

  async save() {
    if (this.form.invalid) return;
    this.saving = true;
    try {
      // TODO: chiamata API
    } finally {
      this.saving = false;
      this.form.markAsPristine();
    }
  }

  changePassword() { alert('Funzione cambio password da implementare'); }
  downloadActivityLog() { alert('Download log attività…'); }

  /* ---------- Toggle ---------- */
  onToggle(key: ToggleKey) {
    const current = !!this.form.get(key)?.value;
    if (current) {
      this.confirm = { state: true, key, label: this.labelFor(key) };
    } else {
      this.applyToggle(key, true);
    }
  }

  private applyToggle(key: ToggleKey, next: boolean) {
    this.form.get(key)?.setValue(next);
  }

  confirmDisable() {
    if (!this.confirm.key) return;
    this.applyToggle(this.confirm.key, false);
    this.closeConfirm();
  }
  closeConfirm() { this.confirm = { state: false, key: null, label: '' }; }

  private labelFor(key: ToggleKey): string {
    switch (key) {
      case 'patientReminders': return 'Promemoria ai pazienti';
      case 'allowPatientPortal': return 'Portale paziente';
      case 'enableAutoLogout': return 'Logout automatico';
    }
  }

  /* ---------- 2FA ---------- */
  openTwofaModal() { this.twofa.open = true; }
  closeTwofa() { this.twofa.open = false; }

  saveTwofa() {
    if (this.twofa.method === 'sms' && !this.twofa.phone) {
      alert('Inserisci un numero di telefono.');
      return;
    }
    if (this.twofa.method === 'email' && !this.twofa.email) {
      alert('Inserisci un indirizzo email.');
      return;
    }
    this.form.get('enable2fa')?.setValue(true);
    this.twofa.open = false;
  }

  /* ---------- Guard canDeactivate ---------- */
  canDeactivate(): Promise<boolean> | boolean {
    if (!this.form.dirty) return true;
    this.showLeaveModal = true;
    return new Promise<boolean>((resolve) => {
      this.leaveResolve = (ok: boolean) => {
        resolve(ok);
      };
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
