// src/app/pages/archivio/archivio.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArchiveService, PatientHistoryItem } from 'src/app/service/archive.service';
import { PatientDto } from 'src/app/model/patient.model';

@Component({
  selector: 'app-archivio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archivio.component.html',
  styleUrls: ['./archivio.component.scss']
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
  history: PatientHistoryItem[] = [];
  historyLoading = false;
  historyError: string | null = null;

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
      next: (items) => {
        this.history = items ?? [];
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
  }
}
