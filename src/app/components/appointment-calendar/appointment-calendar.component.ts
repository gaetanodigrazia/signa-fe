import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs';

import {
  AppointmentInputDTO,
  AppointmentKind,
  AppointmentStatus,
  AppointmentDTO,
} from 'src/app/model/appointment.model';
import { CreatePatientDto, PatientDto } from 'src/app/model/patient.model';
import { PatientService } from 'src/app/service/patient.service';
import { AppointmentService } from 'src/app/service/appointment.service';

@Component({
  selector: 'app-appointment-calendar',
  templateUrl: './appointment-calendar.component.html',
  styleUrls: ['./appointment-calendar.component.scss'],
})
export class AppointmentCalendarComponent implements OnInit {
  /* ====== Vista calendario ====== */
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate = new Date();

  /* ====== Eventi ====== */
  events: CalendarEvent[] = [];
  refresh: Subject<void> = new Subject();

  /* ====== Cache appuntamenti raw (per filtro client) ====== */
  private apptsCache: AppointmentDTO[] = [];

  /* ====== Modale appuntamento (crea/modifica) ====== */
  modalVisible = false;
  editingRef: CalendarEvent | null = null;
  modalData = {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    date: new Date(),
    patientId: null as string | null,
  };

  /* ====== Modale dettagli ====== */
  detailsVisible = false;
  selectedEvent: CalendarEvent | null = null;

  /* ====== Pazienti ====== */
  patients: PatientDto[] = [];

  /* ====== Modale “Nuovo paziente” ====== */
  newPatientModalVisible = false;
  newPatient: CreatePatientDto = {
    firstname: '',
    lastname: '',
    email: '',
    address: '',
    SSN: '',
    dateOfBirth: '',
    active: true,
  };

  /* ====== Patient picker (input + dropdown) ====== */
  @ViewChild('userInputWrap', { static: false })
  userInputWrapRef?: ElementRef<HTMLDivElement>;

  userSearch = '';
  userListOpen = false;
  userResults: PatientDto[] = [];
  highlightIndex = -1;
  userListOpenUp = false;
  userListMaxHeight = 240;

  /* ====== Contesto ====== */
  selectedDoctorId?: string; // opzionale

  /* ====== Stato ====== */
  saving = false;
  loading = false;

  /** Filtro di stato lato client; 'ALL' = nessun filtro */
  statusFilter: AppointmentStatus | 'ALL' = 'ALL';

  constructor(
    private patientsSvc: PatientService,
    private apptSvc: AppointmentService
  ) { }

  /* ===========================
   *         LIFECYCLE
   * =========================== */
  ngOnInit(): void {
    this.loadPatients();
    this.fetchAppointmentsForVisibleRange(); // carica all’apparire
  }

  /* ===========================
   *        PAZIENTI
   * =========================== */
  private loadPatients(): void {
    this.patientsSvc.findAll().subscribe({
      next: (items) => (this.patients = items ?? []),
      error: (err) => {
        console.error('Errore nel recupero pazienti', err);
        this.patients = [];
      },
    });
  }

  getPatientLabel(id: string | null): string {
    if (!id) return '—';
    const p = this.patients.find((x) => x.id === id);
    if (!p) return '—';
    const fullName = [p.firstname, p.lastname].filter(Boolean).join(' ');
    return `${fullName || 'Senza nome'} — ${p.email || 'n/d'}`;
  }

  /* -------- Nuovo paziente (modale) -------- */
  openNewPatientModal(): void {
    this.newPatient = {
      firstname: '',
      lastname: '',
      email: '',
      address: '',
      SSN: '',
      dateOfBirth: '',
      active: true,
    };
    this.newPatientModalVisible = true;
  }
  cancelNewPatient(): void {
    this.newPatientModalVisible = false;
  }
  saveNewPatient(): void {
    const p = this.newPatient;
    if (!p.firstname.trim() || !p.email.trim()) {
      alert('Inserisci almeno nome ed email.');
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email);
    if (!emailOk) {
      alert('Email non valida.');
      return;
    }

    this.patientsSvc
      .create({
        firstname: p.firstname.trim(),
        lastname: p.lastname.trim(),
        email: p.email.trim(),
        address: p.address?.trim() ?? '',
        SSN: p.SSN?.trim() ?? '',
        dateOfBirth: p.dateOfBirth?.trim() ?? '',
        active: true,
      })
      .subscribe({
        next: (created) => {
          this.loadPatients();
          this.modalData.patientId = created.id;
          this.userSearch = this.getPatientLabel(created.id);
          this.newPatientModalVisible = false;
        },
        error: (err) => {
          console.error('Errore nella creazione paziente', err);
          alert('Errore nella creazione del paziente.');
        },
      });
  }

  /* -------- Patient picker -------- */
  openUserList(): void {
    this.userListOpen = true;
    this.onUserSearchChange(this.userSearch);
    this.recomputeUserListPosition();
  }
  closeUserListSoon(): void {
    setTimeout(() => (this.userListOpen = false), 120);
  }
  onUserSearchChange(q: string): void {
    const s = (q || '').trim().toLowerCase();
    const base = this.patients;
    this.userResults = s
      ? base.filter(
        (p) =>
          (p.firstname && p.firstname.toLowerCase().includes(s)) ||
          (p.lastname && p.lastname.toLowerCase().includes(s)) ||
          (p.email && p.email.toLowerCase().includes(s))
      )
      : [...base];
    this.userResults = this.userResults.slice(0, 20);
    this.highlightIndex = this.userResults.length ? 0 : -1;
    this.userListOpen = true;
    this.recomputeUserListPosition();
  }
  onUserInputKeydown(ev: KeyboardEvent): void {
    if (!this.userListOpen || !this.userResults.length) return;
    if (ev.key === 'ArrowDown') {
      this.highlightIndex = (this.highlightIndex + 1) % this.userResults.length;
      ev.preventDefault();
    } else if (ev.key === 'ArrowUp') {
      this.highlightIndex =
        (this.highlightIndex + this.userResults.length - 1) %
        this.userResults.length;
      ev.preventDefault();
    } else if (ev.key === 'Enter') {
      if (this.highlightIndex > -1) {
        this.selectPatient(this.userResults[this.highlightIndex]);
        ev.preventDefault();
      }
    } else if (ev.key === 'Escape') {
      this.userListOpen = false;
    }
  }
  selectPatient(p: PatientDto): void {
    this.modalData.patientId = p.id;
    this.userSearch = this.getPatientLabel(p.id);
    this.userListOpen = false;
  }

  private recomputeUserListPosition(): void {
    const el = this.userInputWrapRef?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 16;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const desired = 320;

    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      this.userListOpenUp = true;
      this.userListMaxHeight = Math.max(180, Math.min(desired, spaceAbove - 8));
    } else {
      this.userListOpenUp = false;
      this.userListMaxHeight = Math.max(180, Math.min(desired, spaceBelow - 8));
    }
  }
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.userListOpen) this.recomputeUserListPosition();
  }

  /* ===========================
   *   CALENDAR / MODALI
   * =========================== */
  /** Click su slot: apre modale creazione */
  onTimeSlotClick(date: Date): void {
    this.openCreateModal(date);
  }

  /** Click su giorno: vai a Day view + fetch */
  handleDayClick(date: Date): void {
    this.viewDate = date;
    this.view = CalendarView.Day;
    this.fetchAppointmentsForVisibleRange();
  }

  /** Cambi vista (Month/Week/Day) */
  onViewChanged(): void {
    this.fetchAppointmentsForVisibleRange();
  }

  /** Toolbar: navigazione in base alla vista */
  goToday(): void {
    this.viewDate = new Date();
    this.fetchAppointmentsForVisibleRange();
  }
  goPrev(): void {
    if (this.view === CalendarView.Month) {
      this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    } else if (this.view === CalendarView.Week) {
      this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), this.viewDate.getDate() - 7);
    } else {
      this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), this.viewDate.getDate() - 1);
    }
    this.fetchAppointmentsForVisibleRange();
  }
  goNext(): void {
    if (this.view === CalendarView.Month) {
      this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    } else if (this.view === CalendarView.Week) {
      this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), this.viewDate.getDate() + 7);
    } else {
      this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), this.viewDate.getDate() + 1);
    }
    this.fetchAppointmentsForVisibleRange();
  }

  openEventDetails(event: CalendarEvent): void {
    this.selectedEvent = event;
    this.detailsVisible = true;
  }
  closeDetails(): void {
    this.detailsVisible = false;
    this.selectedEvent = null;
  }

  editSelected(): void {
    if (!this.selectedEvent) return;
    const ev = this.selectedEvent;
    const date = ev.start ? new Date(ev.start) : new Date();
    const pid = (ev.meta as any)?.patientId ?? null;

    this.editingRef = ev;
    this.modalData = {
      title: ev.title || '',
      description: (ev.meta as any)?.description || '',
      startTime: this.formatTime(date),
      endTime: this.formatTime(
        ev.end ? new Date(ev.end) : new Date(date.getTime() + 30 * 60000)
      ),
      date,
      patientId: pid,
    };
    this.userSearch = pid ? this.getPatientLabel(pid) : '';
    this.detailsVisible = false;
    this.modalVisible = true;
  }

  openCreateModal(date: Date, patient?: { id: string }): void {
    this.editingRef = null;
    this.modalData = {
      title: '',
      description: '',
      startTime: this.formatTime(date),
      endTime: this.formatTime(new Date(date.getTime() + 30 * 60000)),
      date,
      patientId: patient?.id ?? null,
    };
    this.userSearch = patient?.id ? this.getPatientLabel(patient.id) : '';
    this.modalVisible = true;
  }

  closeModal(): void {
    this.modalVisible = false;
    this.editingRef = null;
  }

  /* ===========================
   *         SALVATAGGIO
   * =========================== */
  saveAppointment(
    kind: AppointmentKind = 'VISIT',
    status: AppointmentStatus = 'BOOKED'
  ): void {
    const { title, description, startTime, endTime, date, patientId } =
      this.modalData;
    if (!patientId) {
      alert('Seleziona un paziente.');
      return;
    }
    if (!title || !startTime || !endTime) {
      alert('Compila titolo e orari.');
      return;
    }

    const startDate = this.combineDateAndTime(date, startTime);
    const endDate = this.combineDateAndTime(date, endTime);
    if (startDate >= endDate) {
      alert("L'ora di fine deve essere successiva a quella di inizio.");
      return;
    }

    const payload: AppointmentInputDTO = {
      patient: { id: patientId },
      doctor: this.selectedDoctorId ? { id: this.selectedDoctorId } : undefined,
      startAt: this.toLocalOffsetISOString(startDate),
      endAt: this.toLocalOffsetISOString(endDate),
      kind,
      status,
      reason: title.trim(),
      notes: description?.trim() || undefined,
    };

    this.saving = true;
    this.apptSvc.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.modalVisible = false;
        this.fetchAppointmentsForVisibleRange(); // ricarica coerente col range attuale
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        if (err.status === 409) {
          alert('Conflitto: il medico ha già un appuntamento in quell’orario.');
        } else {
          console.error('create appointment error', err);
          alert('Errore durante la creazione dell’appuntamento.');
        }
      },
    });
  }

  /* ===========================
   *   FETCH APPUNTAMENTI (RANGE)
   * =========================== */

  /** Reagisce al cambio filtro status (client-side) */
  onStatusFilterChange(next: AppointmentStatus | 'ALL'): void {
    this.statusFilter = next;
    this.applyStatusFilterAndMap();
  }

  /** Calcola i bound in base alla vista corrente */
  private rangeForView(d: Date, view: CalendarView): { from: Date; to: Date } {
    if (view === CalendarView.Day) {
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return { from, to };
    }

    if (view === CalendarView.Week) {
      // settimana LUN->DOM (IT)
      const day = d.getDay(); // 0=dom, 1=lun, ..., 6=sab
      const deltaToMonday = (day + 6) % 7; // quante da togliere per arrivare a lun
      const mon = new Date(d);
      mon.setDate(d.getDate() - deltaToMonday);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const from = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate(), 0, 0, 0, 0);
      const to = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate(), 23, 59, 59, 999);
      return { from, to };
    }

    // Month
    const from = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }

  /** Chiama il BE per il range visibile (senza status) e popola il calendario */
  private fetchAppointmentsForVisibleRange(): void {
    const { from, to } = this.rangeForView(this.viewDate, this.view);
    this.loading = true;

    this.apptSvc.findAllByDate(from, to).subscribe({
      next: (list) => {
        this.apptsCache = list || [];
        this.applyStatusFilterAndMap();
        this.loading = false;
      },
      error: (err) => {
        console.error('Errore nel caricamento appuntamenti', err);
        this.apptsCache = [];
        this.applyStatusFilterAndMap();
        this.loading = false;
      },
    });
  }

  /** Applica filtro status (client) e mappa a CalendarEvent[] */
  private applyStatusFilterAndMap(): void {
    const filtered = this.statusFilter === 'ALL'
      ? this.apptsCache
      : this.apptsCache.filter(a => a.status === this.statusFilter);

    this.events = filtered.map((a) => ({
      id: a.id,
      title: a.reason || a.kind || 'Appuntamento',
      start: new Date(a.startAt),
      end: a.endAt ? new Date(a.endAt) : undefined,
      meta: {
        description: a.notes,
        patientId: a.patient?.id,
        doctorId: a.doctor?.id,
        status: a.status,
        kind: a.kind,
      },
    }));
    this.refresh.next();
  }

  /* ===========================
   *           UTILS
   * =========================== */
  private formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  private toLocalOffsetISOString(d: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());

    const tz = -d.getTimezoneOffset();
    const sign = tz >= 0 ? '+' : '-';
    const tzh = pad(Math.floor(Math.abs(tz) / 60));
    const tzm = pad(Math.abs(tz) % 60);

    return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${tzh}:${tzm}`;
  }

  private combineDateAndTime(base: Date, time: string): Date {
    const [H, M] = (time || '09:00').split(':').map(Number);
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), H, M, 0, 0);
  }

  /* ======= (opzionale) Azioni dettagli UI ======= */
  deleteSelected(): void {
    if (!this.selectedEvent) return;
    this.events = this.events.filter((e) => e !== this.selectedEvent);
    this.refresh.next();
    this.closeDetails();
  }
}
