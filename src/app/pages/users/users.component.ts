import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from 'src/app/service/user.service';
import { User } from 'src/app/model/user.model';

type Role = User['role'];

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
  roles: Role[] = ['Admin', 'Editor', 'Viewer'];

  // Modali
  modalVisible = false;
  detailsVisible = false;
  confirmVisible = false;

  // Stato corrente
  editing: User | null = null;
  viewing: User | null = null;
  toDelete: User | null = null;

  // Modello form
  form: { name: string; email: string; role: Role; active: boolean } = {
    name: '',
    email: '',
    role: 'Viewer',
    active: true,
  };

  constructor(private svc: UsersService) { }

  ngOnInit(): void {
    // seed di esempio se vuoto
    if (this.svc.list().length === 0) {
      this.svc.add({ name: 'Mario Rossi', email: 'mario.rossi@example.com', role: 'Admin', active: true });
      this.svc.add({ name: 'Luisa Bianchi', email: 'luisa.bianchi@example.com', role: 'Editor', active: true });
      this.svc.add({ name: 'Paolo Verdi', email: 'paolo.verdi@example.com', role: 'Viewer', active: false });
    }
    this.reload();
  }

  // TrackBy per *ngFor
  trackById(index: number, u: User): number { return u.id; }

  reload(): void {
    this.users = this.svc.list();
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    this.filtered = !q
      ? [...this.users]
      : this.users.filter(u =>
        [u.name, u.email, u.role, u.active ? 'attivo' : 'sospeso']
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
  }

  /* ------------ Azioni tabella ------------ */
  openNew(): void {
    this.editing = null;
    this.form = { name: '', email: '', role: 'Viewer', active: true };
    this.modalVisible = true;
  }

  view(u: User): void {
    this.viewing = u;
    this.detailsVisible = true;
  }

  edit(u: User): void {
    this.editing = u;
    this.form = { name: u.name, email: u.email, role: u.role, active: u.active };
    this.modalVisible = true;
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

  /* ------------ Modale create/update ------------ */
  save(): void {
    const f = this.form;
    if (!f.name.trim() || !f.email.trim()) return;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
    if (!emailOk) return;

    if (this.editing) {
      const updated: User = { ...this.editing, ...f };
      this.svc.update(updated);
      this.editing = null;
    } else {
      this.svc.add({ ...f });
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
}
