import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AppointmentService } from 'src/app/service/appointment.service';
import { PatientService } from 'src/app/service/patient.service';
import { AppointmentDTO, AppointmentStatus } from 'src/app/model/appointment.model';
import { PatientDto } from 'src/app/model/patient.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  // ====== Stato modali ======
  appointmentDetailsVisible = false;
  patientDetailsVisible = false;
  resultVisible = false;

  // elementi per focus quando si apre la modale
  @ViewChild('closeApptBtn') closeApptBtn?: any;
  @ViewChild('closePatientBtn') closePatientBtn?: any;

  // selezioni correnti
  viewingAppointment: any | null = null; // tipizza con il tuo AppointmentDTO se importato qui
  viewingPatient: any | null = null;     // tipizza con il tuo PatientDto se importato qui

  // stato globale
  loadingAll = false;

  // appuntamenti di oggi
  upcoming: AppointmentDTO[] = [];
  loadingUpcoming = false;

  // snapshot pazienti
  allPatients: PatientDto[] = [];
  recentPatients: PatientDto[] = [];
  loadingPatients = false;

  // KPI
  stats = {
    todayTotal: 0,
    todayConfirmed: 0,
    todayCancelled: 0,
    activePatients: 0,
    inactivePatients: 0,
    cancellationRate30d: 0
  };

  constructor(
    private apptSvc: AppointmentService,
    private patientSvc: PatientService,
    private router: Router
  ) { }

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loadingAll = true;
    this.loadUpcomingToday();
    this.loadPatientsSnapshot();
    this.loadKpis();
  }

  createAppointment() {
    this.router.navigate(['/calendar'], {
      state: {
        create: true,
        // opzionale: preimposta una data/ora da “adesso”
        date: new Date().toISOString()
      }
    });
  }

  /* ===== helpers ===== */
  private todayRange(): { from: Date; to: Date } {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from, to };
  }

  /* ===== appuntamenti oggi ===== */
  private loadUpcomingToday(): void {
    this.loadingUpcoming = true;
    const { from, to } = this.todayRange();

    this.apptSvc.findAllByDate(from, to).subscribe({
      next: (list) => {
        const arr = Array.isArray(list) ? list : [];
        this.upcoming = arr
          .slice() // copy
          .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
          .slice(0, 8);
        // KPI del giorno
        this.stats.todayTotal = arr.length;
        this.stats.todayConfirmed = arr.filter(a => a.status === 'CONFIRMED').length as number;
        this.stats.todayCancelled = arr.filter(a => a.status === 'CANCELLED').length as number;
      },
      error: () => { this.upcoming = []; },
      complete: () => {
        this.loadingUpcoming = false;
        this.loadingAll = this.loadingUpcoming || this.loadingPatients;
      }
    });
  }

  /* ===== pazienti ===== */
  private loadPatientsSnapshot(): void {
    this.loadingPatients = true;

    // Carico tutti (come fai in archivio/patients) e calcolo attivi/inattivi
    this.patientSvc.findAll().subscribe({
      next: (items) => {
        const arr = Array.isArray(items) ? items : [];
        this.allPatients = arr;

        // attivi/inattivi (flag 'active' su PatientDto)
        this.stats.activePatients = arr.filter(p => p.active !== false).length;
        this.stats.inactivePatients = arr.length - this.stats.activePatients;

        // una lista "recenti" semplice: ordino alfabeticamente e ne mostro 5
        this.recentPatients = arr
          .slice()
          .sort((a, b) => (a.lastname || '').localeCompare(b.lastname || '') || (a.firstname || '').localeCompare(b.firstname || ''))
          .slice(0, 5);
      },
      error: () => {
        this.allPatients = [];
        this.recentPatients = [];
        this.stats.activePatients = 0;
        this.stats.inactivePatients = 0;
      },
      complete: () => {
        this.loadingPatients = false;
        this.loadingAll = this.loadingUpcoming || this.loadingPatients;
      }
    });
  }

  /* ===== KPI extra: tasso cancellazioni 30gg ===== */
  private loadKpis(): void {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);

    this.apptSvc.findAllByDate(from, to).subscribe({
      next: (list) => {
        const arr = Array.isArray(list) ? list : [];
        const cancelled = arr.filter(a => a.status === 'CANCELLED').length;
        this.stats.cancellationRate30d = arr.length ? cancelled / arr.length : 0;
      },
      error: () => { this.stats.cancellationRate30d = 0; }
    });
  }

  // ====== Apertura/chiusura paziente ======
  openPatient(p: any) {
    // se prima navigavi col router, ora apri modale
    this.viewingPatient = p;
    this.patientDetailsVisible = true;
    document.body.classList.add('body--lock');
    setTimeout(() => this.closePatientBtn?.nativeElement?.focus?.(), 0);
  }

  trackByAppt = (_: number, a: AppointmentDTO) => a.id;
  trackByPatient = (_: number, p: PatientDto) => p.id;






  // ====== Apertura/chiusura appuntamento ======
  openAppointment(a: any) {
    this.viewingAppointment = a;
    this.appointmentDetailsVisible = true;
    document.body.classList.add('body--lock');
    setTimeout(() => this.closeApptBtn?.nativeElement?.focus?.(), 0);
  }

  closeAppointment() {
    this.viewingAppointment = null;
    this.appointmentDetailsVisible = false;
    document.body.classList.remove('body--lock');
  }

  // ====== Esito (modale separata) ======
  openResult() {
    this.resultVisible = true;
    document.body.classList.add('body--lock');
  }
  closeResult() {
    this.resultVisible = false;
    document.body.classList.remove('body--lock');
  }



  closePatient() {
    this.viewingPatient = null;
    this.patientDetailsVisible = false;
    document.body.classList.remove('body--lock');
  }

  // Chiudi con ESC anche se il focus non è dentro la modale
  @HostListener('document:keydown.escape', ['$event'])
  onEsc(_evt: KeyboardEvent) {
    if (this.resultVisible) return this.closeResult();
    if (this.appointmentDetailsVisible) return this.closeAppointment();
    if (this.patientDetailsVisible) return this.closePatient();
  }
  fmtPatientName(v: any): string {
    if (!v?.patient) return '—';
    const first = v.patient.firstname || '';
    const last = v.patient.lastname || '';
    const full = `${first} ${last}`.trim();
    return full || '—';
  }

  fmtDoctorName(v: any): string {
    const u = v?.doctor?.user;
    if (!u) return '—';
    const first = u.firstName || '';
    const last = u.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || '—';
  }

  fmtStudioName(v: any): string {
    return v?.studio?.name || '—';
  }


}
