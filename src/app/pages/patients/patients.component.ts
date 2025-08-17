import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from 'src/app/service/patient.service';
import { PatientDto, CreatePatientDto, PatientForm, PatientStatus } from 'src/app/model/patient.model';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.scss']
})
export class PatientsComponent implements OnInit, OnDestroy {

  /* UI state */
  loading = false;
  saving = false;
  deleting = false;
  changingStatus = false;
  error: string | null = null;

  /* Search & filter */
  search = '';
  status: PatientStatus = 'active';

  /* Today for max date */
  today = new Date().toISOString().slice(0, 10);

  /* Data */
  patients: PatientDto[] = [];
  filtered: PatientDto[] = [];

  /* Modals */
  modalVisible = false;   // create/edit
  detailsVisible = false; // view
  confirmVisible = false; // delete confirm

  /* Current selection */
  viewing: PatientDto | null = null;
  editing: PatientDto | null = null;
  toDelete: PatientDto | null = null;

  /* Form model (UI) */
  form: PatientForm = {
    firstname: '',
    lastname: '',
    email: '',
    address: '',
    phone: '',
    ssn: '',
    dateOfBirth: '',
    active: true
  };
  submitted = false;

  /** Subscription ai query param per aggiornare lo stato */
  private sub?: Subscription;

  constructor(
    private patientSvc: PatientService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Caricamento iniziale
    this.load();

    // Ricarica quando cambia ?status=
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

  /** Carica lista pazienti (server) e normalizza */
  load(): void {
    this.loading = true;
    this.error = null;

    this.patientSvc.findAllWithStatus(this.status).subscribe({
      next: (list: any[]) => {
        const arr = Array.isArray(list) ? list : [];
        this.patients = arr.map(raw => this.normalize(raw));
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

  /** Normalizza proprietà provenienti dal backend */
  private normalize(raw: any): PatientDto {
    const active =
      typeof raw.active === 'boolean' ? raw.active :
        typeof raw.Active === 'boolean' ? raw.Active :
          String(raw.active ?? raw.Active ?? 'true').toLowerCase() === 'true';

    return {
      id: raw.id,
      firstname: raw.firstname ?? raw.first_name ?? '',
      lastname: raw.lastname ?? raw.last_name ?? '',
      email: raw.email ?? '',
      address: raw.address ?? '',
      phone: raw.phone ?? null,
      SSN: raw.SSN ?? raw.ssn ?? '',
      dateOfBirth: raw.dateOfBirth ?? raw.date_of_birth ?? '',
      active
    };
  }

  /** Applica filtro per stato e ricerca */
  applyFilter(): void {
    const q = (this.search || '').trim().toLowerCase();

    const byStatus = this.status === 'all'
      ? this.patients
      : this.patients.filter(p => p.active === (this.status === 'active'));

    if (!q) {
      this.filtered = [...byStatus];
      return;
    }

    this.filtered = byStatus.filter(p => {
      const hay = [
        p.firstname, p.lastname, p.email, p.address, p.phone ?? '',
        (p as any).SSN ?? (p as any).ssn ?? '',
        p.dateOfBirth ?? ''
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  /* ===== Modali ===== */

  openNew(): void {
    this.editing = null;
    this.form = {
      firstname: '',
      lastname: '',
      email: '',
      address: '',
      phone: '',
      ssn: '',
      dateOfBirth: '',
      active: true
    };
    this.submitted = false;
    this.modalVisible = true;
  }

  edit(p: PatientDto): void {
    this.editing = p;
    this.form = {
      id: p.id,
      firstname: p.firstname ?? '',
      lastname: p.lastname ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      phone: p.phone ?? '',
      ssn: (p as any).ssn ?? (p as any).SSN ?? '',
      dateOfBirth: p.dateOfBirth ?? '',
      active: p.active !== false
    };
    this.submitted = false;
    this.modalVisible = true;
  }

  view(p: PatientDto): void {
    this.viewing = p;
    this.detailsVisible = true;
  }

  closeDetails(): void {
    this.viewing = null;
    this.detailsVisible = false;
  }

  cancelModal(): void {
    if (this.saving) return;
    this.modalVisible = false;
    this.editing = null;
  }

  isFormValid(): boolean {
    const f = this.form;
    return !!(f.firstname && f.lastname && f.email && f.dateOfBirth);
  }

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
      address: f.address?.trim() || null,
      phone: f.phone?.trim() || null,
      SSN: f.ssn ? f.ssn.toUpperCase().trim() : null,
      dateOfBirth: f.dateOfBirth || '',
      active: f.active !== false
    };

    console.log("SSN ON CREATE: ", f.ssn);
    const req$ = this.editing
      ? this.patientSvc.update(this.editing.id, payload)
      : this.patientSvc.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.modalVisible = false;
        this.editing = null;
        this.load();
      },
      error: (err) => {
        console.error('save patient error', err);
        this.error = this.readError(err, 'Errore durante il salvataggio del paziente');
        this.saving = false;
      }
    });
  }

  /* ===== Delete ===== */

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

  /* ===== Attiva/Disattiva ===== */

  activate(p: PatientDto): void {
    if (this.changingStatus) return;
    this.changingStatus = true;

    this.patientSvc.setActive(p.id, true).subscribe({
      next: () => {
        this.changingStatus = false;
        this.load();
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

  /* ===== Utils ===== */

  trackByUuid(_idx: number, item: PatientDto): string { return item.id; }

  private readError(err: any, fallback: string): string {
    const msg = err?.error?.message || err?.message || fallback;
    return String(msg);
  }
}
