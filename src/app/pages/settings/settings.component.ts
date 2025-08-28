import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HostListener } from '@angular/core';


type TabKey =
  | 'profile' | 'notifications' | 'agenda'
  | 'clinic' | 'privacy' | 'security' | 'integrations';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  saving = false;

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
    enable2fa: [false],

    // Integrazioni
    googleSync: [false],
    outlookSync: [false],
  });

  constructor(private fb: FormBuilder) { }

  setTab(key: TabKey) {
    this.currentTab = key;
    // aggiorna indicator (approccio light: sposta per indice)
    const idx = this.tabs.findIndex(t => t.key === key);
    this.indicatorTransform = `translateX(${idx * 100}%)`;
  }

  @HostListener('window:resize') onResize() {
    // Recalcolo semplice per sicurezza (se cambi il numero di tab visibili)
    const idx = this.tabs.findIndex(t => t.key === this.currentTab);
    this.indicatorTransform = `translateX(${idx * 100}%)`;
  }

  reset() { this.form.reset(this.form.getRawValue()); }

  async save() {
    if (this.form.invalid) return;
    this.saving = true;
    try {
      // TODO: chiamata API di salvataggio
      // await this.api.saveSettings(this.form.value).toPromise();
    } finally {
      this.saving = false;
      this.form.markAsPristine();
    }
  }

  changePassword() { alert('Funzione cambio password da implementare'); }
  downloadActivityLog() { alert('Download log attività…'); }
}
