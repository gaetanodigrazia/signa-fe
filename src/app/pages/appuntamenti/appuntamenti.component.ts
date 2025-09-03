import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from 'src/app/service/appointment.service';
import { AppointmentDTO, AppointmentStatus } from 'src/app/model/appointment.model';
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
    // Load data on component initialization
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
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
    const needle = this.patientSearch?.trim().toLowerCase() || '';

    // Applichiamo il filtro solo se c'è testo di ricerca
    const source = needle
      ? this.appointments.filter(appt => {
        const fullName =
          ((appt as any)?.patient?.firstname || '') +
          ' ' +
          ((appt as any)?.patient?.lastname || '');
        return fullName.toLowerCase().includes(needle);
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
  }

  closeDetails(): void {
    this.viewing = null;
    this.detailsVisible = false;
  }

  /* ===== Utils ===== */
  trackByUuid(_idx: number, item: AppointmentDTO): string { return item.id; }

  private readError(err: any, fallback: string): string {
    const msg = err?.error?.message || err?.message || fallback;
    return String(msg);
  }
}