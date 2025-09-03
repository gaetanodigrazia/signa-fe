import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from 'src/app/service/appointment.service';
import { AppointmentDTO, AppointmentStatus, AppointmentKind } from 'src/app/model/appointment.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-appuntamenti',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyValuePipe],
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

  // riferimento al bottone "Chiudi" nella modale per focus
  @ViewChild('closeBtn') closeBtn?: ElementRef<HTMLButtonElement>;

  constructor(
    private appointmentSvc: AppointmentService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Initialize dates for a 1-month range
    const today = new Date();
    this.endDate = today.toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    this.startDate = thirtyDaysAgo.toISOString().slice(0, 10);
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

}
