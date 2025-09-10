import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentService } from '../../service/appointment.service';
import { AppointmentDTO, AppointmentInputDTO, RefId } from '../../model/appointment.model';

@Component({
  standalone: true,
  selector: 'app-evento-iniziato',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './evento-iniziato.component.html',
  styleUrls: ['./evento-iniziato.component.scss']
})
export class EventoIniziatoComponent {
  private fb = inject(FormBuilder);
  private api = inject(AppointmentService);

  loading = true;
  saving = false;
  appt!: AppointmentDTO;
  /** esito iniziale (normalizzato) */
  private originalResult = '';
  canSave = false;

  form = this.fb.group({
    studio: [{ value: '', disabled: true }],
    patient: [{ value: '', disabled: true }],
    doctor: [{ value: '', disabled: true }],
    kind: [{ value: '', disabled: true }],
    status: [{ value: '', disabled: true }],
    startAt: [{ value: '', disabled: true }],
    endAt: [{ value: '', disabled: true }],
    reason: [''],
    notes: [''],
    result: ['', Validators.required], // <-- qui
  });

  constructor(private router: Router, private route: ActivatedRoute, private apptSvc: AppointmentService) {
    // Durante la navigazione “calda”
    const navAppt = this.router.getCurrentNavigation()?.extras?.state?.['appt'] as AppointmentDTO | undefined;
    // Fallback: history.state (vale subito dopo la nav, ma NON su refresh)
    const histAppt = (history.state && history.state['appt']) as AppointmentDTO | undefined;

    this.appt = navAppt ?? histAppt;
    // (facoltativo) debug:
    this.form.get('result')!.valueChanges.subscribe(() => this.updateCanSave());

  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    // ✅ usa l'oggetto già catturato nel constructor
    if (this.appt?.id === id) {
      this.initForm(this.appt);
    } else {
      // qui non è arrivato nulla (refresh / nuova tab / deep-link)
      this.loading = false;
      // in futuro: this.api.getById(id).subscribe(appt => this.initForm(appt));
    }
  }

  private displayName(entity: any): string {
    // Tenta i campi più comuni; adatta se i DTO hanno nomi specifici
    return entity?.fullName ?? entity?.name ?? entity?.displayName ?? entity?.id ?? '';
  }

  private initForm(appt: AppointmentDTO) {
    this.appt = appt;
    this.form.patchValue({
      studio: this.displayName(appt.studio),
      patient: appt.patient.firstname + " " + appt.patient.lastname,
      doctor: appt.doctor.user.firstName + " " + appt.doctor.user.lastName,
      kind: appt.kind as any,
      status: appt.status as any,
      startAt: appt.startAt,
      endAt: appt.endAt,
      reason: appt.reason ?? '',
      notes: appt.notes ?? '',
      result: this.originalResult,
    });
    this.updateCanSave();
    this.loading = false;
  }

  /** aggiorna il flag che abilita/disabilita il bottone Salva */
  private updateCanSave() {
    const val = String(this.form.get('result')!.value ?? '').trim();
    // Deve essere non vuoto e diverso dall’originale
    this.canSave = val.length > 0 && val !== this.originalResult;
  }

  salva() {
    // blocca se l’esito non è cambiato o form non valido
    if (!this.canSave || this.form.invalid || !this.appt) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    const raw = this.form.getRawValue();
    const dto: AppointmentInputDTO = {
      patient: { id: this.appt.patient.id },
      ...(this.appt.doctor?.user?.id ? { doctor: { user: { id: this.appt.doctor.user.id } } } : {}),
      startAt: this.appt.startAt,
      endAt: this.appt.endAt,
      kind: this.appt.kind,
      status: 'CLOSED', // se vuoi chiuderla al salvataggio
      reason: raw.reason || undefined,
      notes: raw.notes || undefined,
      result: raw.result?.trim() || undefined, // <-- invia l’esito modificato
    };

    this.apptSvc.update(this.appt.id, dto).subscribe({
      next: () => {
        this.saving = false;
        // aggiorna baseline: ora l’esito corrente è l’originale
        this.originalResult = (raw.result ?? '').trim();
        this.updateCanSave();
        this.router.navigate(['/']);
      },
      error: () => {
        this.saving = false;
        alert('Errore nel salvataggio');
      },
    });
  }

}
