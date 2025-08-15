import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs';
import { CreatePatientDto, PatientDto } from 'src/app/model/patient.model';
import { PatientService } from 'src/app/service/patient.service';

@Component({
  selector: 'app-appointment-calendar',
  templateUrl: './appointment-calendar.component.html',
  styleUrls: ['./appointment-calendar.component.scss'],
})
export class AppointmentCalendarComponent implements OnInit {
  /* ------- Vista calendario ------- */
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate = new Date();

  /* ------- Eventi ------- */
  events: CalendarEvent[] = [];
  refresh: Subject<void> = new Subject();

  /* ------- Modale appuntamento (crea/modifica) ------- */
  modalVisible = false;
  editingRef: CalendarEvent | null = null;
  modalData = {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    date: new Date(),
    patientId: null as string | null, // UUID string
  };

  /* ------- Modale dettagli ------- */
  detailsVisible = false;
  selectedEvent: CalendarEvent | null = null;

  /* ------- Pazienti / servizio ------- */
  patients: PatientDto[] = [];

  /* ------- Modale “Nuovo paziente” ------- */
  newPatientModalVisible = false;
  newPatient: CreatePatientDto = {
    firstname: '',
    lastname: '',
    email: '',
    address: '',
    SSN: '',
    dateOfBirth: '' // ISO 'YYYY-MM-DD'
  };

  /* ------- Patient picker (input + dropdown) ------- */
  @ViewChild('userInputWrap', { static: false })
  userInputWrapRef!: ElementRef<HTMLDivElement>;

  userSearch = '';
  userListOpen = false;
  userResults: PatientDto[] = [];
  highlightIndex = -1;
  userListOpenUp = false;   // true = apre verso l'alto
  userListMaxHeight = 240;  // impostata dinamicamente

  constructor(private patientsSvc: PatientService) { }

  ngOnInit(): void {
    this.loadPatients();
  }

  /* ---------- Patients ---------- */
  loadPatients(): void {
    this.patientsSvc.findAll().subscribe({
      next: (items) => {
        console.log("ITEMS: ", items);
        (this.patients = items ?? [])
      },
      error: (err) => {
        console.error('Errore nel recupero pazienti', err);
        this.patients = [];
      },
    });
  }

  getPatientLabel(id: string | null): string {
    if (!id) return '—';
    const p = this.patients.find(x => x.uuid === id);
    if (!p) return '—';
    const fullName = [p.firstname, p.lastname].filter(Boolean).join(' ');
    return `${fullName || 'Senza nome'} — ${p.email || 'n/d'}`;
  }

  /* ---------- Nuovo paziente (modale) ---------- */
  openNewPatientModal(): void {
    this.newPatient = { firstname: '', lastname: '', email: '', address: '', SSN: '', dateOfBirth: '' };
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

    this.patientsSvc.create({
      firstname: p.firstname.trim(),
      lastname: p.lastname.trim(),
      email: p.email.trim(),
      address: p.address?.trim() ?? '',
      SSN: p.SSN?.trim() ?? '',
      dateOfBirth: p.dateOfBirth?.trim() ?? ''
    }).subscribe({
      next: (created) => {
        // aggiorna lista e seleziona nel picker
        this.loadPatients();
        this.modalData.patientId = created.uuid;
        this.userSearch = this.getPatientLabel(created.uuid);
        this.newPatientModalVisible = false;
      },
      error: (err) => {
        console.error('Errore nella creazione paziente', err);
        alert('Errore nella creazione del paziente.');
      }
    });
  }

  /* ---------- Patient picker logic ---------- */
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
        p =>
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
    this.modalData.patientId = p.uuid;
    const fullName = [p.firstname, p.lastname].filter(Boolean).join(' ');
    this.userSearch = `${fullName || 'Senza nome'} — ${p.email || 'n/d'}`;
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

  /* ---------- Calendar handlers ---------- */
  onTimeSlotClick(date: Date): void {
    this.editingRef = null;
    this.modalData = {
      title: '',
      description: '',
      startTime: this.formatTime(date),
      endTime: this.formatTime(new Date(date.getTime() + 30 * 60000)),
      date,
      patientId: null,
    };
    this.userSearch = '';
    this.modalVisible = true;
  }

  handleDayClick(date: Date): void {
    this.viewDate = date;
    this.view = CalendarView.Day;
  }

  openEventDetails(event: CalendarEvent): void {
    this.selectedEvent = event;
    this.detailsVisible = true;
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.selectedEvent = null;
  }

  deleteSelected(): void {
    if (!this.selectedEvent) return;
    this.events = this.events.filter(e => e !== this.selectedEvent);
    this.refresh.next();
    this.closeDetails();
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

  /* ---------- Utils ---------- */
  formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  closeModal(): void {
    this.modalVisible = false;
    this.editingRef = null;
  }

  saveEvent(): void {
    const { title, description, startTime, endTime, date, patientId } =
      this.modalData;

    if (!title || !startTime || !endTime) {
      alert('Compila titolo e orari.');
      return;
    }

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = new Date(date);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(date);
    end.setHours(eh, em, 0, 0);

    if (start >= end) {
      alert("L'ora di fine deve essere successiva a quella di inizio.");
      return;
    }

    if (this.editingRef) {
      const updated: CalendarEvent = {
        ...this.editingRef,
        title,
        start,
        end,
        meta: { ...(this.editingRef.meta || {}), description, patientId },
      };
      this.events = this.events.map(e => (e === this.editingRef ? updated : e));
      this.editingRef = null;
    } else {
      const newEvent: CalendarEvent = {
        title,
        start,
        end,
        meta: { description, patientId },
      };
      this.events = [...this.events, newEvent];
    }

    this.refresh.next();
    this.closeModal();
  }
}
