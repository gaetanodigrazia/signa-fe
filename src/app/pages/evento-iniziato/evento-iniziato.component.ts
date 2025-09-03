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
    // console.log('navAppt', navAppt, 'histAppt', histAppt);
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
    console.log("APPT, ", appt)
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
      result: ''
    });

    this.loading = false;
  }


  salva() {
    if (this.form.invalid || !this.appt) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;

    // Costruisci il DTO esattamente come da interfaccia che mi hai passato:
    const dto: AppointmentInputDTO = {
      // patient è obbligatorio ed è un RefId
      patient: { id: this.appt.patient.id },

      // doctor è opzionale ma il tipo è UserRef -> { user: { id } }
      ...(this.appt.doctor?.id ? { doctor: { user: { id: this.appt.doctor.user.id } } } : {}),

      startAt: this.appt.startAt,
      endAt: this.appt.endAt,

      // opzionali
      kind: this.appt.kind,
      status: 'CLOSED', // se vuoi chiudere la visita al salvataggio; altrimenti togli
      reason: this.form.getRawValue().reason || undefined,
      notes: this.form.getRawValue().notes || undefined,
      result: this.form.getRawValue().result || undefined, // <-- invio result

    };

    this.apptSvc.update(this.appt.id, dto).subscribe({
      next: () => {
        this.saving = false;
        // vedi punto 2 per l'esito
        this.router.navigate(['/']);
      },
      error: () => {
        this.saving = false;
        alert('Errore nel salvataggio');
      }
    });
  }

}
