import { Component } from '@angular/core';
import {
  CalendarEvent,
  CalendarView,
} from 'angular-calendar';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-appointment-calendar',
  templateUrl: './appointment-calendar.component.html',
  styleUrls: ['./appointment-calendar.component.scss'],
})
export class AppointmentCalendarComponent {
  // 📅 Vista selezionata (mese/settimana/giorno)
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView; // per usare l’enum in HTML

  // 📆 Data attuale visibile
  viewDate: Date = new Date();

  // 📌 Eventi del calendario
  events: CalendarEvent[] = [];

  // 🔁 Trigger per aggiornare il calendario
  refresh: Subject<void> = new Subject();

  // 📦 Stato modale
  modalVisible = false;
  modalData = {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    date: new Date(),
  };

  // 👉 Click su uno slot temporale (giorno o settimana)
  onTimeSlotClick(date: Date): void {
    this.modalData = {
      title: '',
      description: '',
      startTime: this.formatTime(date),
      endTime: this.formatTime(new Date(date.getTime() + 30 * 60000)),
      date,
    };
    this.modalVisible = true;
  }

  // 👉 Click su un giorno nella vista mensile → cambia vista a Giorno
  handleDayClick(date: Date): void {
    this.viewDate = date;
    this.view = CalendarView.Day;
  }

  // ⏱️ Formatta orario HH:MM da una Date
  formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5); // "HH:MM"
  }

  // ❌ Chiude la modale
  closeModal(): void {
    this.modalVisible = false;
  }

  // ✅ Salva l’evento e aggiorna il calendario
  saveEvent(): void {
    const { title, description, startTime, endTime, date } = this.modalData;

    if (!title || !startTime || !endTime) {
      alert('Compila tutti i campi obbligatori.');
      return;
    }

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const start = new Date(date);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(date);
    end.setHours(endH, endM, 0, 0);

    if (start >= end) {
      alert('L’ora di fine deve essere successiva a quella di inizio.');
      return;
    }

    const newEvent: CalendarEvent = {
      title,
      start,
      end,
      meta: {
        description,
      },
    };

    this.events = [...this.events, newEvent];
    this.refresh.next();
    this.closeModal();
  }
}
