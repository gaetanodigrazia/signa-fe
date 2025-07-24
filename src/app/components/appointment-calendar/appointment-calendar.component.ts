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
  view: CalendarView = CalendarView.Month; // default: mese
  viewDate: Date = new Date();

  CalendarView = CalendarView; // 👈 necessario per il template

  events: CalendarEvent[] = [];
  refresh: Subject<void> = new Subject();

  // Per clic su giorno (nella vista mensile)
  handleDayClick(date: Date): void {
    const title = prompt('Titolo appuntamento:');
    if (title && date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0); // Inizio giorno
      const newEvent: CalendarEvent = {
        title,
        start,
        allDay: true,
      };
      this.events = [...this.events, newEvent];
      this.refresh.next();
    }
  }

  // Per clic su orario (nella vista giornaliera)
  handleHourClick(date: Date): void {
    const title = prompt('Titolo appuntamento:');
    if (title && date) {
      const start = new Date(date);
      const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 minuti dopo
      const newEvent: CalendarEvent = {
        title,
        start,
        end,
      };
      this.events = [...this.events, newEvent];
      this.refresh.next();
    }
  }

  // Cambia vista dinamicamente
  setView(view: CalendarView): void {
    this.view = view;
  }
}
