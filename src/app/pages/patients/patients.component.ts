// src/app/pages/patients/patients.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from 'src/app/service/patient.service';
import { PatientDto, CreatePatientDto } from 'src/app/model/patient.model';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.scss']
})
export class PatientsComponent implements OnInit {
  patients: PatientDto[] = [];
  filtered: PatientDto[] = [];

  loading = false;
  error: string | null = null;
  search = '';

  // modali
  modalVisible = false;      // create/edit
  detailsVisible = false;    // view
  confirmVisible = false;    // delete confirm

  // selezioni correnti
  viewing: PatientDto | null = null;
  editing: PatientDto | null = null;
  toDelete: PatientDto | null = null;

  // form paziente (riuso CreatePatientDto per semplicità)
  form: CreatePatientDto = {
    firstname: '',
    lastname: '',
    email: '',
    address: '',
    SSN: '',
    dateOfBirth: '' // ISO yyyy-MM-dd
  };

  constructor(private patientSvc: PatientService) { }

  ngOnInit(): void { this.load(); }

  trackByUuid(_i: number, p: PatientDto): string { return p.uuid; }

  load(): void {
    this.loading = true;
    this.error = null;
    this.patientSvc.findAll().subscribe({
      next: (list) => {
        this.patients = list ?? [];
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('findAll patients error', err);
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

  /* ------------ Azioni tabella ------------ */
  view(p: PatientDto): void {
    this.viewing = p;
    this.detailsVisible = true;
  }

  openNew(): void {
    this.editing = null;
    this.form = { firstname: '', lastname: '', email: '', address: '', SSN: '', dateOfBirth: '' };
    this.modalVisible = true;
  }

  edit(p: PatientDto): void {
    this.editing = p;
    this.form = {
      firstname: p.firstname ?? '',
      lastname: p.lastname ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      SSN: p.SSN ?? '',
      dateOfBirth: p.dateOfBirth ?? ''
    };
    this.modalVisible = true;
  }

  askDelete(p: PatientDto): void {
    this.toDelete = p;
    this.confirmVisible = true;
  }

  confirmDelete(): void {
    if (!this.toDelete) return;
    this.patientSvc.remove(this.toDelete.uuid).subscribe({
      next: () => {
        this.toDelete = null;
        this.confirmVisible = false;
        this.load();
      },
      error: (err) => {
        console.error('delete patient error', err);
        alert('Errore durante l’eliminazione del paziente');
      }
    });
  }

  /* ------------ Modale create/update ------------ */
  save(): void {
    const f = this.form;
    if (!f.firstname.trim() || !f.lastname.trim() || !f.email.trim()) return;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
    if (!emailOk) return;

    const req$ = this.editing
      ? this.patientSvc.update(this.editing.uuid, {
        firstname: f.firstname.trim(),
        lastname: f.lastname.trim(),
        email: f.email.trim(),
        address: f.address?.trim() || '',
        SSN: f.SSN?.trim() || '',
        dateOfBirth: f.dateOfBirth || ''
      })
      : this.patientSvc.create({
        firstname: f.firstname.trim(),
        lastname: f.lastname.trim(),
        email: f.email.trim(),
        address: f.address?.trim() || '',
        SSN: f.SSN?.trim() || '',
        dateOfBirth: f.dateOfBirth || ''
      });

    req$.subscribe({
      next: () => {
        this.modalVisible = false;
        this.editing = null;
        this.load();
      },
      error: (err) => {
        console.error('save patient error', err);
        alert('Errore nel salvataggio del paziente');
      }
    });
  }

  cancelModal(): void {
    this.modalVisible = false;
    this.editing = null;
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.viewing = null;
  }
}
