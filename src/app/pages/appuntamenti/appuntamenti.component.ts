import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from 'src/app/service/appointment.service';
import { AppointmentDTO, AppointmentStatus, AppointmentKind, AppointmentInputDTO } from 'src/app/model/appointment.model';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { Utils } from 'src/app/common/utilis';

@Component({
  selector: 'app-appuntamenti',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyValuePipe, RouterModule],
  templateUrl: './appuntamenti.component.html',
  styleUrl: './appuntamenti.component.scss'
})
export class AppuntamentiComponent implements OnInit, OnDestroy {
  patientSearch: string = '';

  /* UI state */
  loading = false;
  error: string | null = null;

  /* Filters */
  startDate: string;
  endDate: string;
  status: AppointmentStatus | 'BOOKED' = 'BOOKED';

  /* Data */
  appointments: AppointmentDTO[] = [];
  groupedAppointments: { [key: string]: AppointmentDTO[] } = {};

  /* Modals */
  detailsVisible = false;
  viewing: AppointmentDTO | null = null;

  private sub?: Subscription;

  @ViewChild('closeBtn') closeBtn?: ElementRef<HTMLButtonElement>;

  constructor(
    private appointmentSvc: AppointmentService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const today = new Date();
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);


    this.startDate = today.toISOString().slice(0, 10);
    this.endDate = in7Days.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    // safety: sblocca eventuale scroll lock
    document.body.classList.remove('body--lock');
  }



  /** Chiudi modale con ESC anche se il focus non è dentro la modale */
  @HostListener('document:keydown.escape', ['$event'])
  onEsc(_evt: KeyboardEvent) {
    if (this.detailsVisible) this.closeDetails();
    if (this.editVisible) this.closeEdit();
    if (this.resultVisible) this.closeResult();
  }

  /** Loads appointments from the server and groups them by day */
  load(): void {
    this.loading = true;
    this.error = null;

    const fromDate = new Date(this.startDate);
    const toDate = new Date(this.endDate);

    this.appointmentSvc.findAllByDateAndStatus(fromDate, toDate, this.status).subscribe({
      next: (list: AppointmentDTO[]) => {
        this.appointments = list;
        this.groupAppointmentsByDay();
        this.loading = false;
      },
      error: (err) => {
        console.error('findAllByDateAndStatus error', err);
        this.error = this.readError(err, 'Errore nel caricamento degli appuntamenti');
        this.loading = false;
      }
    });
  }

  /** Groups appointments by day for display (with optional patient filter) */
  private groupAppointmentsByDay(): void {
    const needle = (this.patientSearch || '').trim().toLowerCase();

    const source = needle
      ? this.appointments.filter(appt => {
        const firstname = appt?.patient?.firstname || '';
        const lastname = appt?.patient?.lastname || '';
        const full = `${firstname} ${lastname}`.trim().toLowerCase();
        return full.includes(needle);
      })
      : this.appointments;

    const groups: { [key: string]: AppointmentDTO[] } = {};
    source.forEach(appt => {
      const dateKey = new Date(appt.startAt).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(appt);
    });

    this.groupedAppointments = groups;
  }

  /* ===== Modals ===== */
  view(appt: AppointmentDTO): void {
    this.viewing = appt;
    this.detailsVisible = true;
    // blocca scroll sotto la modale
    document.body.classList.add('body--lock');

    // porta il focus al bottone "Chiudi" per accessibilità
    setTimeout(() => this.closeBtn?.nativeElement?.focus(), 0);
  }

  closeDetails(): void {
    this.viewing = null;
    this.detailsVisible = false;
    document.body.classList.remove('body--lock');
  }

  /* ===== Utils ===== */
  trackByUuid(_idx: number, item: AppointmentDTO): string { return item.id; }

  private readError(err: any, fallback: string): string {
    const msg = err?.error?.message || err?.message || fallback;
    return String(msg);
  }

  // --- Helpers per formattare i dettagli in modale (campi sempre presenti con fallback “—”) ---
  fmtPatientName(v: AppointmentDTO | null): string {
    if (!v?.patient) return '—';
    const first = v.patient.firstname || '';
    const last = v.patient.lastname || '';
    const full = `${first} ${last}`.trim();
    return full || '—';
  }

  fmtDoctorName(v: AppointmentDTO | null): string {
    if (!v?.doctor) return '—';
    const u = v.doctor.user;
    const first = u?.firstName || '';
    const last = u?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || '—';
  }

  fmtStudioName(v: AppointmentDTO | null): string {
    return v?.studio?.name || '—';
  }

  fmtCreatedBy(v: AppointmentDTO | null): string {
    if (!v?.createdBy) return '—';
    const first = v.createdBy.firstName || '';
    const last = v.createdBy.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || v.createdBy.email || '—';
  }

  fmtKind(kind?: AppointmentKind): string {
    switch (kind) {
      case 'VISIT': return 'Visita';
      case 'FOLLOW_UP': return 'Follow-up';
      case 'SURGERY': return 'Intervento';
      case 'CONSULT': return 'Consulenza';
      case 'OTHER': return 'Altro';
      default: return '—';
    }
  }

  fmtStatus(status?: AppointmentStatus): string {
    switch (status) {
      case 'BOOKED': return 'Prenotato';
      case 'CONFIRMED': return 'Confermato';
      case 'CLOSED': return 'Concluso';
      case 'CANCELLED': return 'Cancellato';
      default: return '—';
    }
  }

  resultVisible = false;

  openResult(): void {
    this.resultVisible = true;
    document.body.classList.add('body--lock');
  }

  closeResult(): void {
    this.resultVisible = false;
    document.body.classList.remove('body--lock');
  }

  /* ===== Modale modifica (lista) ===== */
  editVisible = false;
  editing: AppointmentDTO | null = null;

  editModel = {
    date: '',         // yyyy-MM-dd
    startTime: '',    // HH:mm
    endTime: '',      // HH:mm
    reason: '',
    notes: '',
    status: 'BOOKED' as AppointmentStatus
  };

  openEdit(appt: AppointmentDTO): void {
    this.editing = appt;

    const start = new Date(appt.startAt);
    const end = new Date(appt.endAt);

    this.editModel = {
      date: start.toISOString().slice(0, 10),
      startTime: Utils.formatTime(start),
      endTime: Utils.formatTime(end),
      reason: appt.reason || '',
      notes: appt.notes || '',
      status: appt.status
    };

    this.editVisible = true;
    document.body.classList.add('body--lock');
  }

  closeEdit(): void {
    this.editVisible = false;
    this.editing = null;
    document.body.classList.remove('body--lock');
  }

  saveEdit(): void {
    if (!this.editing) return;

    const { date, startTime, endTime, reason, notes, status } = this.editModel;
    if (!date || !startTime || !endTime) {
      alert('Compila data e orari.');
      return;
    }

    const startDate = Utils.combineDateAndTime(new Date(date), startTime);
    const endDate = Utils.combineDateAndTime(new Date(date), endTime);
    if (startDate >= endDate) {
      alert("L'ora di fine deve essere successiva a quella di inizio.");
      return;
    }

    const payload: AppointmentInputDTO = {
      patient: { id: this.editing.patient.id },
      doctor: this.editing.doctor?.user?.id ? { user: { id: this.editing.doctor.user.id } } : undefined,
      startAt: Utils.toLocalOffsetISOString(startDate),
      endAt: Utils.toLocalOffsetISOString(endDate),
      kind: this.editing.kind,     // non lo editi qui
      status,                      // cambiabile dalla modale
      reason: reason?.trim() || undefined,
      notes: notes?.trim() || undefined,
    };

    this.loading = true;
    this.appointmentSvc.update(this.editing.id, payload).subscribe({
      next: () => {
        this.loading = false;
        this.closeEdit();
        this.load(); // ricarica elenco
      },
      error: (err) => {
        this.loading = false;
        console.error('Errore update', err);
        alert('Errore durante il salvataggio.');
      }
    });
  }

  deleteEditing(): void {
    if (!this.editing) return;
    if (!confirm('Eliminare questo appuntamento?')) return;

    this.loading = true;
    this.appointmentSvc.delete(this.editing.id).subscribe({
      next: () => {
        this.loading = false;
        this.closeEdit();
        this.load();
      },
      error: (err) => {
        this.loading = false;
        console.error('Errore delete', err);
        alert('Impossibile eliminare l’appuntamento.');
      }
    });
  }

  createAppointmentForUser(patientId?: string | null) {
    const stateBase = { create: true, date: new Date().toISOString() };
    console.log("State base ", stateBase);

    // altrimenti prefiltra col paziente
    this.router.navigate(['/calendar'], {
      state: { ...stateBase, patientId }
    });
  }




  /** TEMPLATE CAMBIO STATO DA ESTRARRE */

  // Stato modale "Cambia stato"
  statusVisible = false;
  savingStatus = false;
  statusEditing: AppointmentDTO | null = null;
  statusModel: { status: AppointmentStatus, result: string } = { status: 'BOOKED', result: '' };

  openStatus(appt: AppointmentDTO): void {
    this.statusEditing = appt;
    this.statusModel = {
      status: appt.status,   // precompilo con lo stato attuale
      result: appt.result || '' // se c’è già un esito, lo mostro
    };
    this.statusVisible = true;
    document.body.classList.add('body--lock');
  }

  closeStatus(): void {
    this.statusVisible = false;
    this.statusEditing = null;
    this.savingStatus = false;
    document.body.classList.remove('body--lock');
  }

  /** Salva cambio stato: se nuovo stato = CLOSED, esito obbligatorio.
   *  Sequenza: (se CLOSED) PATCH /result -> poi PATCH /status
   */
  saveStatusChange(): void {
    if (!this.statusEditing) return;

    const apptId = this.statusEditing.id;
    const newStatus = this.statusModel.status;
    const needsResult = newStatus === 'CLOSED';

    if (needsResult && !this.statusModel.result?.trim()) {
      alert('Inserisci un esito per chiudere l’appuntamento.');
      return;
    }

    this.savingStatus = true;

    const doUpdateStatus = () => {
      this.appointmentSvc.updateStatus(apptId, newStatus).subscribe({
        next: () => {
          this.savingStatus = false;
          this.closeStatus();
          this.load(); // ricarica lista
        },
        error: (err) => {
          this.savingStatus = false;
          console.error('Errore updateStatus', err);
          alert('Errore nel cambio stato.');
        }
      });
    };

    if (needsResult) {
      // 1) salva esito
      const payload = this.statusModel.result.trim();
      this.appointmentSvc.insertResult(apptId, payload).subscribe({
        next: () => {
          // 2) poi cambia stato a CLOSED
          doUpdateStatus();
        },
        error: (err) => {
          this.savingStatus = false;
          console.error('Errore insertResult', err);
          alert('Errore nel salvataggio dell’esito.');
        }
      });
    } else {
      // solo cambio stato
      doUpdateStatus();
    }
  }

}
