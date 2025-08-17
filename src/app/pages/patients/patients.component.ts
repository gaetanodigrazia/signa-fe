import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from 'src/app/service/patient.service';
import { PatientDto, CreatePatientDto } from 'src/app/model/patient.model';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

/** Stato filtro pazienti da query param */
type PatientStatus = 'active' | 'inactive' | 'all';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.scss']
})
export class PatientsComponent implements OnInit, OnDestroy {
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
    dateOfBirth: '', // ISO yyyy-MM-dd
    active: true

  };
  submitted = false; // mostra gli errori solo dopo il primo submit

  /** Stato corrente preso dall'URL (?status=...) */
  status: PatientStatus = 'active';
  /** Subscription ai query param per aggiornare lo stato */
  private sub?: Subscription;

  constructor(
    private patientSvc: PatientService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Caricamento iniziale (fallback)
    this.load();

    // Ascolta i query params e ricarica quando cambia ?status=
    this.sub = this.route.queryParamMap
      .pipe(
        map(q => (q.get('status') as PatientStatus) || 'active'),
        distinctUntilChanged()
      )
      .subscribe(st => {
        this.status = st;
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /* Utils */
  trackByUuid(_i: number, p: PatientDto): string { return p.id; }

  /* Load + filter */
  load(): void {
    this.loading = true;
    this.error = null;

    this.patientSvc.findAllWithStatus(this.status).subscribe({
      next: (list) => {
        // Normalizza active anche se arriva come string/number
        this.patients = (list ?? []).map(p => ({
          ...p,
          active: typeof p.active === 'boolean'
            ? p.active
            : String((p as any).active).toLowerCase() === 'true'
        }));
        this.applyFilter();
        this.loading = false;
        console.log('Result', list);
      },
      error: (err) => {
        this.error = this.readError(err, 'Errore durante il caricamento dei pazienti');
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    const q = (this.search ?? '').trim().toLowerCase();

    // 1) filtro per stato
    const filteredByStatus =
      this.status === 'all'
        ? this.patients
        : this.patients.filter(p => p.active === (this.status === 'active'));

    // 2) filtro per ricerca
    if (!q) {
      this.filtered = [...filteredByStatus];
      return;
    }

    this.filtered = filteredByStatus.filter(p => {
      const name = `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim();
      return [
        name, p.firstname ?? '', p.lastname ?? '', p.email ?? '',
        p.address ?? '', (p as any).SSN ?? '', p.dateOfBirth ?? ''
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
    this.form = { firstname: '', lastname: '', email: '', address: '', SSN: '', dateOfBirth: '', active: true };
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
      SSN: (p as any).SSN ?? (p as any).ssn ?? '',
      dateOfBirth: p.dateOfBirth ?? '',
      active: true
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

    this.patientSvc.remove(this.toDelete.id).subscribe({
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
      dateOfBirth: f.dateOfBirth || '',
      active: true
    };

    const req$ = this.editing
      ? this.patientSvc.update(this.editing.id, payload)   // <-- UPDATE
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

  changingStatus = false;

  activate(p: PatientDto): void {
    if (this.changingStatus) return;
    this.changingStatus = true;
    this.error = null;

    this.patientSvc.setActive(p.id, true).subscribe({
      next: () => {
        this.changingStatus = false;
        this.load(); // ricarica la lista con lo status corrente
      },
      error: (err) => {
        console.error('activate patient error', err);
        this.error = this.readError(err, 'Errore durante l’attivazione del paziente');
        this.changingStatus = false;
      }
    });
  }

  deactivate(p: PatientDto): void {
    if (this.changingStatus) return;
    this.changingStatus = true;
    this.error = null;

    this.patientSvc.setActive(p.id, false).subscribe({
      next: () => {
        this.changingStatus = false;
        this.load();
      },
      error: (err) => {
        console.error('deactivate patient error', err);
        this.error = this.readError(err, 'Errore durante la disattivazione del paziente');
        this.changingStatus = false;
      }
    });
  }

}
