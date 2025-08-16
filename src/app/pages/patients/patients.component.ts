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
  /* Data */
  patients: PatientDto[] = [];
  filtered: PatientDto[] = [];

  /* UI state */
  loading = false;
  saving = false;
  deleting = false;
  error: string | null = null;
  search = '';

  /* Modals */
  modalVisible = false;     // create/edit
  detailsVisible = false;   // view
  confirmVisible = false;   // delete confirm

  /* Current selection */
  viewing: PatientDto | null = null;
  editing: PatientDto | null = null;
  toDelete: PatientDto | null = null;

  /* Form model */
  form: CreatePatientDto = {
    firstname: '',
    lastname: '',
    email: '',
    address: '',
    SSN: '',
    dateOfBirth: '' // ISO yyyy-MM-dd
  };
  submitted = false; // mostra gli errori solo dopo il primo submit

  constructor(private patientSvc: PatientService) { }

  ngOnInit(): void {
    this.load();
  }

  /* Utils */
  trackByUuid(_i: number, p: PatientDto): string { return p.uuid; }

  /* Load + filter */
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
        this.error = this.readError(err, 'Errore nel caricamento pazienti');
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    if (!q) {
      this.filtered = [...this.patients];
      return;
    }
    this.filtered = this.patients.filter(p => {
      const name = `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim();
      return [
        name, p.firstname ?? '', p.lastname ?? '', p.email ?? '',
        p.address ?? '', p.SSN ?? '', p.dateOfBirth ?? ''
      ].join(' ').toLowerCase().includes(q);
    });
  }

  /* Table actions */
  view(p: PatientDto): void {
    this.viewing = p;
    this.detailsVisible = true;
  }

  openNew(): void {
    this.editing = null;
    this.form = { firstname: '', lastname: '', email: '', address: '', SSN: '', dateOfBirth: '' };
    this.submitted = false;
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
    this.submitted = false;
    this.modalVisible = true;
  }

  askDelete(p: PatientDto): void {
    this.toDelete = p;
    this.confirmVisible = true;
  }

  confirmDelete(): void {
    if (!this.toDelete || this.deleting) return;
    this.deleting = true;

    this.patientSvc.remove(this.toDelete.uuid).subscribe({
      next: () => {
        this.toDelete = null;
        this.confirmVisible = false;
        this.deleting = false;
        this.load();
      },
      error: (err) => {
        console.error('delete patient error', err);
        this.error = this.readError(err, 'Errore durante l’eliminazione del paziente');
        this.deleting = false;
      }
    });
  }

  /* Create / Update */
  save(): void {
    this.submitted = true;
    if (!this.isFormValid()) return;
    if (this.saving) return;

    this.saving = true;
    const f = this.form;

    const payload: CreatePatientDto = {
      firstname: f.firstname.trim(),
      lastname: f.lastname.trim(),
      email: f.email.trim(),
      address: f.address?.trim() || '',
      SSN: f.SSN?.trim() || '',
      dateOfBirth: f.dateOfBirth || ''
    };

    const req$ = this.editing
      ? this.patientSvc.update(this.editing.uuid, payload)   // <-- UPDATE
      : this.patientSvc.create(payload);                     // <-- CREATE

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.modalVisible = false;
        this.editing = null;
        this.submitted = false;
        this.load();
      },
      error: (err) => {
        console.error('save patient error', err);
        this.error = this.readError(err, 'Errore nel salvataggio del paziente');
        this.saving = false;
      }
    });
  }

  /* Modal controls */
  cancelModal(): void {
    this.modalVisible = false;
    this.editing = null;
    this.submitted = false;
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.viewing = null;
  }

  /* Validation helpers */
  private isFormValid(): boolean {
    const f = this.form;

    // Nome, cognome, email obbligatori
    if (!f.firstname?.trim() || !f.lastname?.trim() || !f.email?.trim()) return false;

    // Email valida
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
    if (!emailOk) return false;

    // Data di nascita obbligatoria e in formato valido
    if (!f.dateOfBirth?.trim()) return false;
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(f.dateOfBirth);
    if (!dateOk) return false;

    // CF opzionale, ma se presente deve essere 11–16 alfanumerici
    if (f.SSN && !/^[A-Za-z0-9]{11,16}$/.test(f.SSN)) return false;

    return true;
  }

  private readError(err: any, fallback: string): string {
    return err?.error?.message || err?.message || fallback;
  }
}
