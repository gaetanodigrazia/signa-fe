// src/app/components/settings-profile/settings-profile.component.ts
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { SettingsUserService } from '../../service/settings-user.service';
import {
  LocaleCode,
  TimeFormat,
  StudioMemberProfileUpdateDto,
  StudioMemberSettingsDto,
} from '../../model/settings-user.model';

@Component({
  selector: 'app-settings-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-profile.component.html',
  styleUrls: ['./settings-profile.component.scss'],
})
export class SettingsProfileComponent implements OnInit {
  private fb = inject(FormBuilder).nonNullable;
  private userSvc = inject(SettingsUserService);
  private destroyRef = inject(DestroyRef);

  loading = false;
  saving = false;
  hasChanges = false;
  hasSettings = false; // 👈 decide POST vs PATCH

  private initialSnapshot:
    | {
      locale: LocaleCode;
      timeFormat: TimeFormat;
      enable2fa: boolean;
      enableAutoLogout: boolean;
      autoLogoutMinutes: number;
    }
    | null = null;

  private toLocaleCode(x: any): LocaleCode { return x === 'en-GB' ? 'en-GB' : 'it-IT'; }
  private toTimeFormat(x: any): TimeFormat { return x === '12h' ? '12h' : '24h'; }

  form = this.fb.group({
    // (Se vuoi rimettere anche firstName/lastName/title/email, aggiungi i controlli qui)
    locale: this.fb.control<LocaleCode>('it-IT'),
    timeFormat: this.fb.control<TimeFormat>('24h'),

    enable2fa: this.fb.control<boolean>(false),
    enableAutoLogout: this.fb.control<boolean>(true),
    autoLogoutMinutes: this.fb.control<number>(15, {
      validators: [Validators.required, Validators.min(5), Validators.max(120)],
    }),
  });

  ngOnInit(): void {
    this.loading = true;

    // toggle abilita/disabilita minuti
    this.form.controls.enableAutoLogout.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => {
        const ctl = this.form.controls.autoLogoutMinutes;
        if (enabled) {
          ctl.enable({ emitEvent: false });
          ctl.setValidators([Validators.required, Validators.min(5), Validators.max(120)]);
        } else {
          ctl.disable({ emitEvent: false });
          ctl.clearValidators();
        }
        ctl.updateValueAndValidity({ emitEvent: false });
        this.recomputeHasChanges();
      });

    // GET unica
    this.userSvc.getMySettings().subscribe({
      next: (me) => {
        if (me) {
          this.hasSettings = true;
          this.prefillFromDto(me);
        } else {
          // nessun body (edge) → considera come “assente”
          this.hasSettings = false;
          this.snapshotDefaults();
        }
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          // non esiste ancora → prima volta (POST al save)
          this.hasSettings = false;
          this.snapshotDefaults();
        } else {
          console.error('[SettingsProfile] getMySettings error', err);
          alert('Impossibile caricare le impostazioni.');
        }
      },
      complete: () => (this.loading = false),
    });

    // tracking modifiche
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recomputeHasChanges());
  }

  private prefillFromDto(me: StudioMemberSettingsDto): void {
    // fallback “robusto” anche se i flag sono in settings.security
    const sec = me.settings?.security ?? {};
    const prof = me.settings?.profile ?? {};

    const locale = (me.locale ?? prof.locale ?? 'it-IT') as LocaleCode;
    const timeFormat = (me.timeFormat ?? prof.timeFormat ?? '24h') as TimeFormat;

    this.form.patchValue(
      {
        locale: this.toLocaleCode(locale),
        timeFormat: this.toTimeFormat(timeFormat),
        enable2fa: (me.enable2fa ?? sec.enable2fa ?? false) as boolean,
        enableAutoLogout: (me.enableAutoLogout ?? sec.enableAutoLogout ?? true) as boolean,
        autoLogoutMinutes: (me.autoLogoutMinutes ?? sec.autoLogoutMinutes ?? 15) as number,
      },
      { emitEvent: false }
    );

    // disabilita minuti se necessario
    if (!this.form.controls.enableAutoLogout.value) {
      this.form.controls.autoLogoutMinutes.disable({ emitEvent: false });
    }

    // snapshot
    this.initialSnapshot = this.currentSnapshot();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.hasChanges = false;
  }

  private snapshotDefaults(): void {
    // mantieni i default del form come stato iniziale
    if (!this.form.controls.enableAutoLogout.value) {
      this.form.controls.autoLogoutMinutes.disable({ emitEvent: false });
    }
    this.initialSnapshot = this.currentSnapshot();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.hasChanges = false;
  }

  private currentSnapshot() {
    const v = this.form.getRawValue();
    return {
      locale: v.locale!,
      timeFormat: v.timeFormat!,
      enable2fa: v.enable2fa!,
      enableAutoLogout: v.enableAutoLogout!,
      autoLogoutMinutes: Number(v.autoLogoutMinutes ?? 0),
    };
  }

  private recomputeHasChanges() {
    if (!this.initialSnapshot) { this.hasChanges = false; return; }
    this.hasChanges = JSON.stringify(this.currentSnapshot()) !== JSON.stringify(this.initialSnapshot);
  }

  resetToInitial(): void {
    if (!this.initialSnapshot) return;
    this.form.patchValue(this.initialSnapshot, { emitEvent: false });
    if (this.initialSnapshot.enableAutoLogout) {
      this.form.controls.autoLogoutMinutes.enable({ emitEvent: false });
    } else {
      this.form.controls.autoLogoutMinutes.disable({ emitEvent: false });
    }
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.hasChanges = false;
  }

  private buildUnifiedDto(): StudioMemberProfileUpdateDto {
    const v = this.form.getRawValue();

    // unico DTO per POST/PATCH; mantengo anche il mirror nel JSON settings
    return {
      locale: v.locale!,
      timeFormat: v.timeFormat!,
      settings: {
        profile: {
          locale: v.locale!,
          timeFormat: v.timeFormat!,
        },
        security: {
          enable2fa: v.enable2fa!,
          enableAutoLogout: v.enableAutoLogout!,
          autoLogoutMinutes: v.enableAutoLogout ? Number(v.autoLogoutMinutes ?? 15) : undefined,
        },
      },
    };
  }

  save(): void {
    if (this.form.invalid || !this.hasChanges) return;
    this.saving = true;

    const dto = this.buildUnifiedDto();
    const call$ = this.hasSettings
      ? this.userSvc.updateSettings(dto)   // PATCH
      : this.userSvc.createSettings(dto);  // POST

    call$.subscribe({
      next: (updated) => {
        // usa la risposta se presente, altrimenti conferma lo snapshot da dto
        if (updated) {
          this.prefillFromDto(updated);
          this.hasSettings = true;
        } else {
          // fallback: considera applicato, aggiorna snapshot dal form
          this.initialSnapshot = this.currentSnapshot();
          this.form.markAsPristine();
          this.form.markAsUntouched();
          this.hasChanges = false;
          this.hasSettings = true;
        }
      },
      error: (err) => {
        console.error('[SettingsProfile] save error', err);
        alert('Errore nel salvataggio impostazioni.');
      },
      complete: () => (this.saving = false),
    });
  }

  // per eventuale CanDeactivate guard
  canDeactivate(): boolean {
    return this.form.pristine || confirm('Hai modifiche non salvate. Vuoi davvero uscire?');
  }
}
