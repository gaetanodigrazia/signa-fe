import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs';

// ⬇️ Adatta il path se diverso nel tuo progetto
import { UsersService, User } from 'src/app/service/user.service';

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
    userId: null as number | null,
  };

  /* ------- Modale dettagli ------- */
  detailsVisible = false;
  selectedEvent: CalendarEvent | null = null;

  /* ------- Utenti / servizio ------- */
  users: User[] = [];

  /* ------- Modale “Nuovo utente” ------- */
  newUserModalVisible = false;
  newUser: { name: string; email: string; role: User['role']; active: boolean } =
    { name: '', email: '', role: 'Viewer', active: true };

  /* ------- User picker (input + dropdown) ------- */
  @ViewChild('userInputWrap', { static: false })
  userInputWrapRef!: ElementRef<HTMLDivElement>;

  userSearch = '';
  userListOpen = false;
  userResults: User[] = [];
  highlightIndex = -1;
  userListOpenUp = false;   // true = apre verso l'alto
  userListMaxHeight = 240;  // impostata dinamicamente

  constructor(private usersSvc: UsersService) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  /* ---------- Users ---------- */
  loadUsers(): void {
    this.users = this.usersSvc.list();
  }

  getUserLabel(id: number | null): string {
    if (id == null) return '—';
    const u = this.users.find(x => x.id === id);
    return u ? `${u.name} — ${u.email}` : '—';
  }

  openNewUserModal(): void {
    this.newUser = { name: '', email: '', role: 'Viewer', active: true };
    this.newUserModalVisible = true;
  }
  cancelNewUser(): void {
    this.newUserModalVisible = false;
  }
  saveNewUser(): void {
    const n = this.newUser;
    if (!n.name.trim() || !n.email.trim()) {
      alert('Inserisci nome ed email.');
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email);
    if (!emailOk) {
      alert('Email non valida.');
      return;
    }
    const created = this.usersSvc.add({
      name: n.name.trim(),
      email: n.email.trim(),
      role: n.role,
      active: n.active,
    });
    this.loadUsers();
    this.modalData.userId = created.id;
    this.userSearch = this.getUserLabel(created.id);
    this.newUserModalVisible = false;
  }

  /* ---------- User picker logic ---------- */
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
    const base = this.users;
    this.userResults = s
      ? base.filter(
        u =>
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s)
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
        this.selectUser(this.userResults[this.highlightIndex]);
        ev.preventDefault();
      }
    } else if (ev.key === 'Escape') {
      this.userListOpen = false;
    }
  }
  selectUser(u: User): void {
    this.modalData.userId = u.id;
    this.userSearch = `${u.name} — ${u.email}`;
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
      userId: null,
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
    const uid = (ev.meta as any)?.userId ?? null;

    this.editingRef = ev;
    this.modalData = {
      title: ev.title || '',
      description: (ev.meta as any)?.description || '',
      startTime: this.formatTime(date),
      endTime: this.formatTime(
        ev.end ? new Date(ev.end) : new Date(date.getTime() + 30 * 60000)
      ),
      date,
      userId: uid,
    };
    this.userSearch = uid ? this.getUserLabel(uid) : '';
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
    const { title, description, startTime, endTime, date, userId } =
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
        meta: { ...(this.editingRef.meta || {}), description, userId },
      };
      this.events = this.events.map(e => (e === this.editingRef ? updated : e));
      this.editingRef = null;
    } else {
      const newEvent: CalendarEvent = {
        title,
        start,
        end,
        meta: { description, userId },
      };
      this.events = [...this.events, newEvent];
    }

    this.refresh.next();
    this.closeModal();
  }
}
