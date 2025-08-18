import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs';

import {
  AppointmentInputDTO,
  AppointmentKind,
  AppointmentStatus,
  AppointmentDTO,
} from 'src/app/model/appointment.model';
import { CreatePatientDto } from 'src/app/model/patient.model';
import { AppointmentService } from 'src/app/service/appointment.service';
import { PatientsFacade } from 'src/app/service/patient.facade';
import { Utils } from 'src/app/common/utilis';

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

  /* ====== Contesto ====== */
  selectedDoctorId?: string; // opzionale

  /* ====== Stato ====== */
  loading = false;   // spinner: fetch calendario
  saving = false;    // spinner: salvataggio appuntamento
  deleting = false;  // spinner: eliminazione appuntamento

  /** Filtro di stato lato client; 'ALL' = nessun filtro */
  statusFilter: AppointmentStatus | 'ALL' = 'ALL';

  constructor(
    private apptSvc: AppointmentService,
    private patientsFacade: PatientsFacade
  ) { }

  ngOnInit(): void {
    this.patientsFacade.ensureLoaded();
    this.fetchAppointmentsForVisibleRange();
  }

  /* ====== Pazienti ====== */
  getPatientLabel(id: string | null): string {
    const p = this.patientsFacade.findByIdSync(id);
    if (!p) return '—';
    const fullName = [p.firstname, p.lastname].filter(Boolean).join(' ');
    return `${fullName || 'Senza nome'} — ${p.email || 'n/d'}`;
  }

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
  cancelNewPatient(): void { this.newPatientModalVisible = false; }

  saveNewPatient(): void {
    const p = this.newPatient;
    if (!p.firstname?.trim() || !p.email?.trim()) { alert('Inserisci almeno nome ed email.'); return; }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email);
    if (!emailOk) { alert('Email non valida.'); return; }

    this.patientsFacade.create({
      firstname: p.firstname.trim(),
      lastname: p.lastname?.trim() ?? '',
      email: p.email.trim(),
      address: p.address?.trim() ?? '',
      SSN: p.SSN?.trim() ?? '',
      dateOfBirth: p.dateOfBirth?.trim() ?? '',
      active: true,
    }).subscribe({
      next: (created) => {
        this.modalData.patientId = created.id;
        this.newPatientModalVisible = false;
      },
      error: (err) => {
        console.error('Errore nella creazione paziente', err);
        alert('Errore nella creazione del paziente.');
      },
    });
  }

  /* ====== Calendar / toolbar ====== */
  onTimeSlotClick(date: Date): void { this.openCreateModal(date); }

  handleDayClick(date: Date): void {
    this.viewDate = date;
    this.view = CalendarView.Day;
    this.fetchAppointmentsForVisibleRange();
  }

  onViewChanged(): void { this.fetchAppointmentsForVisibleRange(); }
  goToday(): void { this.viewDate = new Date(); this.fetchAppointmentsForVisibleRange(); }
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

  openEventDetails(event: CalendarEvent): void { this.selectedEvent = event; this.detailsVisible = true; }
  closeDetails(): void { this.detailsVisible = false; this.selectedEvent = null; }

  editSelected(): void {
    if (!this.selectedEvent) return;
    const ev = this.selectedEvent;
    const date = ev.start ? new Date(ev.start) : new Date();
    const pid = (ev.meta as any)?.patientId ?? null;

    this.editingRef = ev;
    this.modalData = {
      title: ev.title || '',
      description: (ev.meta as any)?.description || '',
      startTime: Utils.formatTime(date),
      endTime: Utils.formatTime(ev.end ? new Date(ev.end) : new Date(date.getTime() + 30 * 60000)),
      date,
      patientId: pid,
    };
    this.detailsVisible = false;
    this.modalVisible = true;
  }

  openCreateModal(date: Date, patient?: { id: string }): void {
    this.editingRef = null;
    this.modalData = {
      title: '',
      description: '',
      startTime: Utils.formatTime(date),
      endTime: Utils.formatTime(new Date(date.getTime() + 30 * 60000)),
      date,
      patientId: patient?.id ?? null,
    };
    this.modalVisible = true;
  }

  closeModal(): void { this.modalVisible = false; this.editingRef = null; }

  /* ====== Salvataggio ====== */
  saveAppointment(kind: AppointmentKind = 'VISIT', status: AppointmentStatus = 'BOOKED'): void {
    const { title, description, startTime, endTime, date, patientId } = this.modalData;
    if (!patientId) { alert('Seleziona un paziente.'); return; }
    if (!title || !startTime || !endTime) { alert('Compila titolo e orari.'); return; }

    const startDate = Utils.combineDateAndTime(date, startTime);
    const endDate = Utils.combineDateAndTime(date, endTime);
    if (startDate >= endDate) { alert("L'ora di fine deve essere successiva a quella di inizio."); return; }

    const payload: AppointmentInputDTO = {
      patient: { id: patientId },
      doctor: this.selectedDoctorId ? { id: this.selectedDoctorId } : undefined,
      startAt: Utils.toLocalOffsetISOString(startDate),
      endAt: Utils.toLocalOffsetISOString(endDate),
      kind, status,
      reason: title.trim(),
      notes: description?.trim() || undefined,
    };

    this.saving = true;
    this.apptSvc.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.modalVisible = false;
        this.fetchAppointmentsForVisibleRange();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        if (err.status === 409) alert('Conflitto: il medico ha già un appuntamento in quell’orario.');
        else { console.error('create appointment error', err); alert('Errore durante la creazione dell’appuntamento.'); }
      },
    });
  }

  /* ====== Fetch appuntamenti ====== */
  onStatusFilterChange(next: AppointmentStatus | 'ALL'): void {
    this.statusFilter = next;
    this.applyStatusFilterAndMap();
  }

  private rangeForView(d: Date, view: CalendarView): { from: Date; to: Date } {
    if (view === CalendarView.Day) {
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return { from, to };
    }
    if (view === CalendarView.Week) {
      const day = d.getDay(); // 0=dom, 1=lun ...
      const deltaToMonday = (day + 6) % 7;
      const mon = new Date(d); mon.setDate(d.getDate() - deltaToMonday);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const from = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate(), 0, 0, 0, 0);
      const to = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate(), 23, 59, 59, 999);
      return { from, to };
    }
    const from = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }

  private fetchAppointmentsForVisibleRange(): void {
    const { from, to } = this.rangeForView(this.viewDate, this.view);
    this.loading = true;
    this.apptSvc.findAllByDate(from, to).subscribe({
      next: (list) => { this.apptsCache = list || []; this.applyStatusFilterAndMap(); this.loading = false; },
      error: (err) => {
        console.error('Errore nel caricamento appuntamenti', err);
        this.apptsCache = []; this.applyStatusFilterAndMap(); this.loading = false;
      },
    });
  }

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

  /* ====== Eliminazione ====== */
  deleteSelected(): void {
    if (!this.selectedEvent?.id) return;
    const id = String(this.selectedEvent.id);

    if (!confirm('Eliminare questo appuntamento?')) return;

    this.deleting = true;
    this.apptSvc.delete(id).subscribe({
      next: () => {
        this.deleting = false;
        // rimuovi dall’elenco locale
        this.events = this.events.filter(e => String(e.id) !== id);
        this.refresh.next();
        this.closeDetails();
      },
      error: (err) => {
        this.deleting = false;
        console.error('delete appointment error', err);
        alert('Impossibile eliminare l’appuntamento.');
      }
    });
  }
}
