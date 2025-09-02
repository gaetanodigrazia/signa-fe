import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { EventColor } from 'calendar-utils';
import { Subject } from 'rxjs';

import {
  AppointmentDTO,
  AppointmentInputDTO,
  AppointmentKind,
  AppointmentStatus,
} from 'src/app/model/appointment.model';
import { CreatePatientDto, PatientDto } from 'src/app/model/patient.model';
import { PatientService } from 'src/app/service/patient.service';
import { AppointmentService } from 'src/app/service/appointment.service';
import { Utils } from 'src/app/common/utilis';
import { StudioMemberDto, StudioMembersService } from 'src/app/service/studiomembers.service';

@Component({
  selector: 'app-appointment-calendar',
  templateUrl: './appointment-calendar.component.html',
  styleUrls: ['./appointment-calendar.component.scss'],
})
export class AppointmentCalendarComponent implements OnInit {
  /* ====== Dottori ====== */
  doctors: StudioMemberDto[] = [];
  doctorsLoading = false;

  /* ====== Vista calendario ====== */
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate = new Date();

  /* ====== Eventi ====== */
  events: CalendarEvent[] = [];
  refresh: Subject<void> = new Subject();

  /* ====== Cache raw ====== */
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
  statusEdit: AppointmentStatus = 'BOOKED';   // per PATCH dello status

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

  /* ====== Patient picker (se usi input custom) ====== */
  @ViewChild('userInputWrap', { static: false }) userInputWrapRef?: ElementRef<HTMLDivElement>;
  userSearch = '';
  userListOpen = false;
  userResults: PatientDto[] = [];
  highlightIndex = -1;
  userListOpenUp = false;
  userListMaxHeight = 240;

  /* ====== Contesto ====== */
  selectedDoctorId?: string;

  /* ====== Stato UI ====== */
  loading = false;
  saving = false;        // salvataggio create/update
  deleting = false;      // eliminazione
  statusSaving = false;  // patch status

  /** Filtro di stato (client); 'ALL' = nessun filtro */
  statusFilter: AppointmentStatus | 'ALL' = 'ALL';

  constructor(
    private patientsSvc: PatientService,
    private apptSvc: AppointmentService,
    private membersSvc: StudioMembersService
  ) { }


  /* ===========================
   *         LIFECYCLE
   * =========================== */
  ngOnInit(): void {
    this.loadPatients();
    this.loadDoctors();
    this.fetchAppointmentsForVisibleRange();
  }

  /* ===========================
 *        DOTTORI
 * =========================== */
  getDoctorLabel(id: string | null | undefined): string {
    const d = this.doctors.find(x => x.user?.id === id);
    if (d) {
      const fullName = [d.user.firstName, d.user.lastName].filter(Boolean).join(' ');
      return fullName || d.user.email || '-';
    }
    return '-';
  }


  private loadDoctors(): void {
    this.doctorsLoading = true;
    this.membersSvc.listMembers().subscribe({
      next: (items) => {
        this.doctors = (items ?? []).filter(m => m.role === 'DOCTOR' && m.active !== false);
        this.doctorsLoading = false;
      },
      error: (err) => {
        console.error('Errore nel recupero dottori', err);
        this.doctors = [];
        this.doctorsLoading = false;
      }
    });
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

  openNewPatientModal(): void {
    this.newPatient = { firstname: '', lastname: '', email: '', address: '', SSN: '', dateOfBirth: '', active: true };
    this.newPatientModalVisible = true;
  }
  cancelNewPatient(): void { this.newPatientModalVisible = false; }
  saveNewPatient(): void {
    const p = this.newPatient;
    if (!p.firstname?.trim() || !p.email?.trim()) { alert('Inserisci almeno nome ed email.'); return; }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email);
    if (!emailOk) { alert('Email non valida.'); return; }

    this.patientsSvc.create({
      firstname: p.firstname.trim(),
      lastname: p.lastname?.trim() ?? '',
      email: p.email.trim(),
      address: p.address?.trim() ?? '',
      SSN: p.SSN?.trim() ?? '',
      dateOfBirth: p.dateOfBirth?.trim() ?? '',
      active: true,
    }).subscribe({
      next: (created) => {
        this.patients = [created, ...this.patients];
        // seleziona il nuovo paziente nel form corrente
        this.modalData.patientId = created.id;
        this.newPatientModalVisible = false;

        this.loadPatients();
      },
      error: (err) => {
        console.error('Errore nella creazione paziente', err);
        alert('Errore nella creazione del paziente.');
      },
    });
  }

  /* ====== Patient picker base (solo se usi input custom) ====== */
  openUserList(): void {
    this.userListOpen = true;
    this.onUserSearchChange(this.userSearch);
    this.recomputeUserListPosition();
  }
  closeUserListSoon(): void { setTimeout(() => (this.userListOpen = false), 120); }
  onUserSearchChange(q: string): void {
    const s = (q || '').trim().toLowerCase();
    const base = this.patients;
    this.userResults = s
      ? base.filter(p =>
        (p.firstname && p.firstname.toLowerCase().includes(s)) ||
        (p.lastname && p.lastname.toLowerCase().includes(s)) ||
        (p.email && p.email.toLowerCase().includes(s)))
      : [...base];
    this.userResults = this.userResults.slice(0, 20);
    this.highlightIndex = this.userResults.length ? 0 : -1;
    this.userListOpen = true;
    this.recomputeUserListPosition();
  }
  onUserInputKeydown(ev: KeyboardEvent): void {
    if (!this.userListOpen || !this.userResults.length) return;
    if (ev.key === 'ArrowDown') { this.highlightIndex = (this.highlightIndex + 1) % this.userResults.length; ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { this.highlightIndex = (this.highlightIndex + this.userResults.length - 1) % this.userResults.length; ev.preventDefault(); }
    else if (ev.key === 'Enter') { if (this.highlightIndex > -1) { this.selectPatient(this.userResults[this.highlightIndex]); ev.preventDefault(); } }
    else if (ev.key === 'Escape') { this.userListOpen = false; }
  }
  selectPatient(p: PatientDto): void { this.modalData.patientId = p.id; this.userListOpen = false; }
  private recomputeUserListPosition(): void {
    const el = this.userInputWrapRef?.nativeElement; if (!el) return;
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
  @HostListener('window:resize') onWindowResize(): void { if (this.userListOpen) this.recomputeUserListPosition(); }

  /* ===========================
   *   CALENDAR / MODALI
   * =========================== */
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

  openEventDetails(event: CalendarEvent): void {
    console.log("REMOVE - CALLED THIS ", event)
    this.selectedEvent = event;
    // inizializza il selettore stato con lo stato corrente dell’evento
    const cur = (event.meta as any)?.status as AppointmentStatus | undefined;
    this.statusEdit = cur ?? 'BOOKED';
    this.detailsVisible = true;
  }
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
    // mantieni lo status corrente per il PUT
    const cur = (ev.meta as any)?.status as AppointmentStatus | undefined;
    this.statusEdit = cur ?? 'BOOKED';

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
    this.statusEdit = 'BOOKED'; // default
    this.modalVisible = true;
  }

  closeModal(): void { this.modalVisible = false; this.editingRef = null; }

  /* ===========================
   *         SALVATAGGIO
   * =========================== */
  saveAppointment(kind: AppointmentKind = 'VISIT', _statusDefault: AppointmentStatus = 'BOOKED'): void {
    const { title, description, startTime, endTime, date, patientId } = this.modalData;
    if (!patientId) { alert('Seleziona un paziente.'); return; }
    if (!title || !startTime || !endTime) { alert('Compila titolo e orari.'); return; }

    const startDate = Utils.combineDateAndTime(date, startTime);
    const endDate = Utils.combineDateAndTime(date, endTime);
    if (startDate >= endDate) { alert("L'ora di fine deve essere successiva a quella di inizio."); return; }

    // usa statusEdit sia in create che in update (puoi anche esporre un select nello stesso form)
    const payload: AppointmentInputDTO = {
      patient: { id: patientId },
      doctor: this.selectedDoctorId ? { id: this.selectedDoctorId } : undefined,
      startAt: Utils.toLocalOffsetISOString(startDate),
      endAt: Utils.toLocalOffsetISOString(endDate),
      kind,
      status: this.statusEdit,
      reason: title.trim(),
      notes: description?.trim() || undefined,
    };

    this.saving = true;

    if (this.editingRef?.id) {
      // UPDATE completo (PUT)
      const id = String(this.editingRef.id);
      this.apptSvc.update(id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.modalVisible = false;
          this.fetchAppointmentsForVisibleRange();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          console.error('update appointment error', err);
          alert('Errore durante l’aggiornamento dell’appuntamento.');
        },
      });
    } else {
      // CREATE
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
  }

  /* ===========================
   *   FETCH & MAPPING
   * =========================== */
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
      // Lun-Dom
      const day = d.getDay(); // 0=dom, 1=lun
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
      color: this.colorByStatus(a.status),
      meta: {
        description: a.notes,
        patientId: a.patient?.id,
        doctorId: a.doctor?.user.id,
        status: a.status,
        kind: a.kind,
      },
    }));

    this.refresh.next();
  }

  private colorByStatus(s: AppointmentStatus): EventColor {
    switch (s) {
      case 'BOOKED': return { primary: '#2563eb', secondary: '#dbeafe' };
      case 'CONFIRMED': return { primary: '#059669', secondary: '#d1fae5' };
      case 'CLOSED': return { primary: '#6b7280', secondary: '#e5e7eb' };
      case 'CANCELLED': return { primary: '#dc2626', secondary: '#fee2e2' };
      default: return { primary: '#2563eb', secondary: '#dbeafe' };
    }
  }

  /* ===========================
   *        PATCH STATUS
   * =========================== */
  applyStatusChange(): void {
    if (!this.selectedEvent?.id) return;
    const id = String(this.selectedEvent.id);
    const nextStatus = this.statusEdit;

    this.statusSaving = true;
    this.apptSvc.updateStatus(id, nextStatus).subscribe({
      next: () => {
        // aggiorna evento selezionato + lista eventi in memoria
        const idx = this.events.findIndex(e => String(e.id) === id);
        if (idx > -1) {
          const ev = this.events[idx];
          ev.meta = { ...(ev.meta || {}), status: nextStatus };
          ev.color = this.colorByStatus(nextStatus);
          this.events = [...this.events];
          this.refresh.next();
        }
        // aggiorna cache per coerenza
        const cidx = this.apptsCache.findIndex(a => a.id === id);
        if (cidx > -1) this.apptsCache[cidx].status = nextStatus;

        this.statusSaving = false;
      },
      error: (err) => {
        this.statusSaving = false;
        console.error('patch status error', err);
        alert('Impossibile aggiornare lo stato.');
      }
    });
  }

  /* ===========================
   *        DELETE
   * =========================== */
  deleteSelected(): void {
    if (!this.selectedEvent?.id) return;
    const id = String(this.selectedEvent.id);
    if (!confirm('Eliminare questo appuntamento?')) return;

    this.deleting = true;
    this.apptSvc.delete(id).subscribe({
      next: () => {
        this.deleting = false;
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
