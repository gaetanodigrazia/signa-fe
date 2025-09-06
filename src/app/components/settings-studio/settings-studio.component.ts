// src/app/components/settings-studio/settings-studio.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  SettingsStudioService,
  StudioSettingsDto,
  StudioSettingsUpdateDto,
} from '../../service/settings-studio.service';

@Component({
  selector: 'app-settings-studio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-studio.component.html',
  styleUrls: ['./settings-studio.component.scss']
})
export class SettingsStudioComponent implements OnInit {
  private fb = inject(FormBuilder).nonNullable;
  private studioSvc = inject(SettingsStudioService);

  loading = false;
  saving = false;
  hasSettings = false;

  /** snapshot dell’ultimo stato sincronizzato col server (usato da resetToLast e per canDeactivate) */
  private lastLoaded!: {
    patientReminders: boolean;
    allowPatientPortal: boolean;
    emailSignature: string;
    slotDuration: string;
    slotBuffer: string;
    clinicName: string;
    clinicPhone: string;
    clinicAddress: string;
    vatId: string;
    iban: string;
  };

  form = this.fb.group({
    patientReminders: this.fb.control<boolean>(true),
    allowPatientPortal: this.fb.control<boolean>(false),
    emailSignature: this.fb.control<string>(''),
    slotDuration: this.fb.control<string>('30', { validators: [Validators.required] }),
    slotBuffer: this.fb.control<string>('5', { validators: [Validators.required] }),
    clinicName: this.fb.control<string>(''),
    clinicPhone: this.fb.control<string>(''),
    clinicAddress: this.fb.control<string>(''),
    vatId: this.fb.control<string>(''),
    iban: this.fb.control<string>(''),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.studioSvc.getSettings().subscribe({
      next: (st) => {
        if (st) {
          this.hasSettings = true;
          this.prefill(st);
        } else {
          // nessun settings: teniamo i default a form e segniamo hasSettings=false
          this.hasSettings = false;
          const defaults = this.currentNormalizedFromForm();
          this.lastLoaded = defaults;
          this.form.reset(defaults, { emitEvent: false });
          this.form.markAsPristine();
        }
      },
      error: (err) => {
        console.error('[StudioSettings] getSettings error', err);
        alert('Impossibile caricare le impostazioni di studio.');
      },
      complete: () => (this.loading = false),
    });
  }

  /** Riempie il form da un DTO server e aggiorna lastLoaded */
  private prefill(st: StudioSettingsDto): void {
    const normalized = {
      patientReminders: st.digital?.patientReminders ?? true,
      allowPatientPortal: st.digital?.allowPatientPortal ?? false,
      emailSignature: st.digital?.emailSignature ?? '',
      slotDuration: String(st.agenda?.slotDuration ?? 30),
      slotBuffer: String(st.agenda?.slotBuffer ?? 5),
      clinicName: st.billing?.clinicName ?? '',
      clinicPhone: st.billing?.clinicPhone ?? '',
      clinicAddress: st.billing?.clinicAddress ?? '',
      vatId: st.billing?.vatId ?? '',
      iban: st.billing?.iban ?? '',
    };

    this.lastLoaded = normalized;
    this.form.reset(normalized, { emitEvent: false }); // reset => pristine/untouched
    this.form.markAsPristine();
  }

  /** Torna ai valori dell’ultima sincronizzazione col server */
  resetToLast(): void {
    if (!this.lastLoaded) return;
    this.form.reset(this.lastLoaded, { emitEvent: false });
    this.form.markAsPristine();
  }

  /** Costruisce il payload Update/Input dal form */
  private buildDto(): StudioSettingsUpdateDto {
    const v = this.form.getRawValue();
    return {
      digital: {
        patientReminders: !!v.patientReminders,
        allowPatientPortal: !!v.allowPatientPortal,
        emailSignature: (v.emailSignature ?? '').trim(),
      },
      agenda: {
        slotDuration: Number(v.slotDuration ?? 30),
        slotBuffer: Number(v.slotBuffer ?? 5),
      },
      billing: {
        clinicName: (v.clinicName ?? '').trim(),
        clinicPhone: (v.clinicPhone ?? '').trim(),
        clinicAddress: (v.clinicAddress ?? '').trim(),
        vatId: (v.vatId ?? '').trim(),
        iban: (v.iban ?? '').trim(),
      },
    };
  }

  /** Normalizza l’attuale stato del form (per snapshot/compare) */
  private currentNormalizedFromForm() {
    const v = this.form.getRawValue();
    return {
      patientReminders: !!v.patientReminders,
      allowPatientPortal: !!v.allowPatientPortal,
      emailSignature: (v.emailSignature ?? '').trim(),
      slotDuration: String(v.slotDuration ?? '30'),
      slotBuffer: String(v.slotBuffer ?? '5'),
      clinicName: (v.clinicName ?? '').trim(),
      clinicPhone: (v.clinicPhone ?? '').trim(),
      clinicAddress: (v.clinicAddress ?? '').trim(),
      vatId: (v.vatId ?? '').trim(),
      iban: (v.iban ?? '').trim(),
    };
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const dto = this.buildDto();
    const call$ = this.hasSettings
      ? this.studioSvc.updateSettings(dto)
      : this.studioSvc.createSettings(dto);

    call$.subscribe({
      next: (updated) => {
        // Se il backend torna null/204, ricostruisco da dto; altrimenti uso updated
        const effective: StudioSettingsDto = updated ?? {
          studioId: 'current',
          digital: dto.digital ?? undefined,
          agenda: dto.agenda ?? undefined,
          billing: dto.billing ?? undefined,
        };
        this.hasSettings = true;        // da ora in poi PATCH
        this.prefill(effective);        // aggiorna form + lastLoaded + pristine
      },
      error: (err) => {
        console.error('[StudioSettings] save error', err);
        alert('Errore nel salvataggio impostazioni studio.');
      },
      complete: () => (this.saving = false),
    });
  }

  canDeactivate(): boolean {
    return this.form.pristine || confirm('Hai modifiche non salvate. Vuoi davvero uscire?');
  }
}
