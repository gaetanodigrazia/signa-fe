import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from 'src/app/service/user.service';
import { User } from 'src/app/model/user.model';

type StudioRole = 'OWNER' | 'DOCTOR' | 'BACKOFFICE' | 'NURSE' | 'STAFF';
interface MembershipForm { studioId: string | null; role: StudioRole; active: boolean; }
interface Studio { id: string; name: string; }

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  filtered: User[] = [];

  search = '';

  // Modali
  modalVisible = false;
  detailsVisible = false;
  confirmVisible = false;

  // Wizard
  step: 0 | 1 | 2 = 0;

  // Stato corrente
  editing: User | null = null;
  viewing: User | null = null;
  toDelete: User | null = null;

  // Lookup per studi e ruoli (sostituisci con service se li hai)
  studioRoles: StudioRole[] = ['OWNER', 'DOCTOR', 'BACKOFFICE', 'NURSE', 'STAFF'];
  studios: Studio[] = [
    { id: 'studio-1', name: 'Studio Dentistico Sorriso' },
    { id: 'studio-2', name: 'Centro Oculistico Vista Chiara' },
    { id: 'studio-3', name: 'Studio di Nutrizione Sana Vita' },
  ];

  // Modello form
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    active: boolean;
    memberships: MembershipForm[];
  } = this.blankForm();

  constructor(private svc: UsersService) { }

  ngOnInit(): void {
    // seed di esempio se vuoto
    if (this.svc.list().length === 0) {
      this.svc.add({ firstName: 'Mario', lastName: 'Rossi', email: 'mario.rossi@example.com', phone: '3401234567', active: true } as any);
      this.svc.add({ firstName: 'Luisa', lastName: 'Bianchi', email: 'luisa.bianchi@example.com', phone: '3407654321', active: true } as any);
      this.svc.add({ firstName: 'Paolo', lastName: 'Verdi', email: 'paolo.verdi@example.com', phone: '3400000000', active: false } as any);
    }
    this.reload();
  }

  // ---------- tabella ----------
  trackById(_: number, u: User): number { return u.id; }

  reload(): void {
    this.users = this.svc.list();
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    this.filtered = !q
      ? [...this.users]
      : this.users.filter(u =>
        [u.firstName, u.lastName, u.email, (u as any).phone, u.active ? 'attivo' : 'sospeso']
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
  }

  /* ------------ Azioni tabella ------------ */
  openNew(): void {
    this.editing = null;
    this.form = this.blankForm();
    this.modalVisible = true;
    this.step = 0;
  }

  view(u: User): void {
    this.viewing = u;
    this.detailsVisible = true;
  }

  edit(u: User): void {
    this.editing = u;
    this.form = {
      firstName: (u as any).firstName ?? u.firstName,
      lastName: (u as any).lastName ?? u.lastName,
      email: u.email,
      phone: (u as any).phone ?? '',
      active: u.active,
      memberships: [] // se le carichi da backend mappale qui
    };
    if (this.form.memberships.length === 0) this.addMembership();
    this.modalVisible = true;
    this.step = 0;
  }

  askDelete(u: User): void {
    this.toDelete = u;
    this.confirmVisible = true;
  }

  confirmDelete(): void {
    if (!this.toDelete) return;
    this.svc.remove(this.toDelete.id);
    this.toDelete = null;
    this.confirmVisible = false;
    this.reload();
  }

  /* ------------ Wizard ------------ */
  next(): void {
    if (!this.isStepValid(this.step)) return;
    if (this.step < 2) this.step++;
  }

  prev(): void {
    if (this.step > 0) this.step--;
  }

  isStepValid(s: number): boolean {
    if (s === 0) {
      const f = this.form;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
      return !!f.firstName.trim() && !!f.lastName.trim() && !!f.email.trim() && emailOk;
    }
    if (s === 1) {
      // Se uno studio è selezionato deve esserci un ruolo; righe vuote sono consentite
      return this.form.memberships.every(m => !m.studioId || !!m.role);
    }
    return true;
  }

  /* ------------ Modale create/update ------------ */
  save(): void {
    if (!this.isStepValid(2)) return;

    const f = this.form;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
    if (!emailOk) return;

    const membershipsClean = f.memberships.filter(m => !!m.studioId);

    if (this.editing) {
      // NB: il tuo UsersService potrebbe non supportare memberships: nessun problema
      const updated: any = { ...this.editing, ...f, memberships: membershipsClean };
      // Mantieni anche nome completo se il model legacy lo usa
      if (!(this.editing as any).firstName && !(this.editing as any).lastName) {
        updated.name = `${f.firstName} ${f.lastName}`.trim();
      }
      this.svc.update(updated);
      this.editing = null;
    } else {
      const payload: any = { ...f, memberships: membershipsClean };
      // Compatibilità con eventuale model legacy { name: string }
      payload.name = `${f.firstName} ${f.lastName}`.trim();
      this.svc.add(payload);
    }

    this.modalVisible = false;
    this.reload();
  }

  cancelModal(): void {
    this.modalVisible = false;
    this.editing = null;
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.viewing = null;
  }

  /* ------------ Membership helpers ------------ */
  addMembership(): void {
    this.form.memberships.push({ studioId: null, role: 'STAFF', active: true });
  }

  removeMembership(i: number): void {
    this.form.memberships.splice(i, 1);
    if (this.form.memberships.length === 0) this.addMembership();
  }

  trackByMembership = (_: number, m: MembershipForm) => m.studioId ?? _;

  /* ------------ Helpers ------------ */
  private blankForm() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      active: true,
      memberships: [] as MembershipForm[],
    };
  }

  private splitName(full: string | undefined) {
    const s = (full || '').trim();
    if (!s) return { first: '', last: '' };
    const [first, ...rest] = s.split(/\s+/);
    return { first, last: rest.join(' ') };
  }
  studioName(id: string | null): string {
    if (!id) return '';
    const s = this.studios.find(x => x.id === id);
    return s ? s.name : '';
  }

}
