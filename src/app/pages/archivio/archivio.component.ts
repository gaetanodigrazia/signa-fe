// src/app/pages/archivio/archivio.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArchiveService, PatientHistoryItem } from 'src/app/service/archive.service';
import { PatientDto } from 'src/app/model/patient.model';
import { AppointmentDTO, AppointmentHistoryDTO, HistoryItem } from 'src/app/model/appointment.model';
import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-archivio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archivio.component.html',
  styleUrls: ['./archivio.component.scss'],
  animations: [
    trigger('detailPulse', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(6px) scale(.98)' }),
        animate('180ms ease-out', style({ opacity: 1, transform: 'none' }))
      ])
    ])
  ]


})
export class ArchivioComponent implements OnInit {
  patients: PatientDto[] = [];
  filtered: PatientDto[] = [];

  loading = false;
  error: string | null = null;
  search = '';

  // Dettaglio/History
  detailsVisible = false;
  viewing: PatientDto | null = null;
  history: HistoryItem[] = [];
  historyLoading = false;
  historyError: string | null = null;
  selectedHistory?: HistoryItem;

  constructor(private archiveSvc: ArchiveService) { }

  ngOnInit(): void { this.load(); }

  trackByUuid(_i: number, p: PatientDto): string { return p.id; }

  load(): void {
    this.loading = true;
    this.error = null;
    this.archiveSvc.listPatients().subscribe({
      next: (list) => {
        this.patients = list ?? [];
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Archivio listPatients error', err);
        this.error = 'Errore nel caricamento pazienti';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    this.filtered = !q
      ? [...this.patients]
      : this.patients.filter(p => {
        const name = `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim();
        return [
          name, p.firstname ?? '', p.lastname ?? '', p.email ?? '',
          p.address ?? '', p.SSN ?? '', p.dateOfBirth ?? ''
        ].join(' ').toLowerCase().includes(q);
      });
  }

  view(p: PatientDto): void {
    this.viewing = p;
    this.detailsVisible = true;
    this.history = [];
    this.historyLoading = true;
    this.historyError = null;

    this.archiveSvc.getHistory(p.id).subscribe({
      next: (items: AppointmentHistoryDTO[]) => {
        console.log("Result", items);

        this.history = (items ?? []).map(a => ({
          id: a.id,
          date: new Date(a.startAt),
          description: a.reason,
          studioName: a.studio?.name,
          doctorName: `${a.doctor?.user?.firstName} ${a.doctor?.user?.lastName}`,
          patientName: `${a.patient?.firstname} ${a.patient?.lastname}`,
          status: a.status
        } as HistoryItem));

        this.historyLoading = false;
      },
      error: (err) => {
        console.error('Archivio getHistory error', err);
        this.historyError = 'Errore nel caricamento dello storico';
        this.historyLoading = false;
      }
    });
  }


  closeDetails(): void {
    this.detailsVisible = false;
    this.viewing = null;
    this.history = [];
    this.historyError = null;
    this.closeHistoryDetail();
  }

  trackByDateDesc = (_: number, h: HistoryItem) => `${h.date?.toISOString?.() ?? h.date}-${h.description}`;


  detailAnimKey = 0;
  openHistoryDetail(h: HistoryItem) {
    this.selectedHistory = h;
    this.detailAnimKey++; // ogni click cambia stato e fa ripartire l’animazione
  }
  closeHistoryDetail(): void {        // <-- deve essere public
    this.selectedHistory = null;
  }

}

