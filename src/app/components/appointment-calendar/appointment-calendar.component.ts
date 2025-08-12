import { Component } from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-appointment-calendar',
  templateUrl: './appointment-calendar.component.html',
  styleUrls: ['./appointment-calendar.component.scss'],
})
export class AppointmentCalendarComponent {
  // 📅 Vista
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;

  // 📆 Data visibile
  viewDate: Date = new Date();

  // 📌 Eventi
  events: CalendarEvent[] = [];

  // 🔁 Refresh
  refresh: Subject<void> = new Subject();

  // 📦 Modale crea/modifica
  modalVisible = false;
  editingRef: CalendarEvent | null = null;
  modalData = {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    date: new Date(),
  };

  // 👁️ Modale dettagli
  detailsVisible = false;
  selectedEvent: CalendarEvent | null = null;

  // 👉 Click su slot (giorno/settimana)
  onTimeSlotClick(date: Date): void {
    this.editingRef = null;
    this.modalData = {
      title: '',
      description: '',
      startTime: this.formatTime(date),
      endTime: this.formatTime(new Date(date.getTime() + 30 * 60000)),
      date,
    };
    this.modalVisible = true;
  }

  // 👉 Click su giorno in Vista Mese → cambia a Giorno
  handleDayClick(date: Date): void {
    this.viewDate = date;
    this.view = CalendarView.Day;
  }

  // 👉 Click su un evento: mostra dettagli
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

    this.editingRef = ev;
    this.modalData = {
      title: ev.title || '',
      description: (ev.meta as any)?.description || '',
      startTime: this.formatTime(date),
      endTime: this.formatTime(ev.end ? new Date(ev.end) : new Date(date.getTime() + 30 * 60000)),
      date,
    };

    this.detailsVisible = false;
    this.modalVisible = true;
  }

  // ⏱️ HH:MM
  formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  // ❌ Chiude modale crea/modifica
  closeModal(): void {
    this.modalVisible = false;
    this.editingRef = null;
  }

  // ✅ Salva/aggiorna evento
  saveEvent(): void {
    const { title, description, startTime, endTime, date } = this.modalData;

    if (!title || !startTime || !endTime) {
      alert('Compila tutti i campi obbligatori.');
      return;
    }

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    const start = new Date(date);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(date);
    end.setHours(eh, em, 0, 0);

    if (start >= end) {
      alert('L’ora di fine deve essere successiva a quella di inizio.');
      return;
    }

    if (this.editingRef) {
      // update
      const updated: CalendarEvent = {
        ...this.editingRef,
        title,
        start,
        end,
        meta: { ...(this.editingRef.meta || {}), description },
      };
      this.events = this.events.map(e => (e === this.editingRef ? updated : e));
      this.editingRef = null;
    } else {
      // create
      const newEvent: CalendarEvent = {
        title,
        start,
        end,
        meta: { description },
      };
      this.events = [...this.events, newEvent];
    }

    this.refresh.next();
    this.closeModal();
  }
}
