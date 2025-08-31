import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from 'src/app/service/user.service';
import { User } from 'src/app/model/user.model';
import { StudioMembersService, StudioMemberInputDto, StudioRole, StudioMemberDto } from 'src/app/service/studiomembers.service';

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
  users: (User & { memberId?: string })[] = [];   // <-- tengo anche lo studioMemberId
  filtered: (User & { memberId?: string })[] = [];

  search = '';

  // Modali
  modalVisible = false;
  detailsVisible = false;
  confirmVisible = false;
  saving = false;
  loading = false;

  // Wizard
  step: 0 | 1 | 2 = 0;

  // Stato corrente
  editing: (User & { memberId?: string }) | null = null;
  viewing: StudioMemberDto | null = null;        // <-- ora mostriamo il DTO reale
  toDelete: (User & { memberId?: string }) | null = null;

  studioRoles: StudioRole[] = ['OWNER', 'DOCTOR', 'BACKOFFICE', 'ADMIN'];
  studios: Studio[] = [
    { id: 'studio-1', name: 'Studio Dentistico Sorriso' },
    { id: 'studio-2', name: 'Centro Oculistico Vista Chiara' },
    { id: 'studio-3', name: 'Studio di Nutrizione Sana Vita' },
  ];

  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    active: boolean;
    memberships: MembershipForm[];
  } = this.blankForm();

  constructor(private svc: UsersService, private membersSvc: StudioMembersService) { }

  ngOnInit(): void {
    this.load();
  }

  /** Carica membri e memorizza anche lo studioMemberId */
  load(): void {
    this.loading = true;
    this.membersSvc.listMembers().subscribe({
      next: (members: StudioMemberDto[]) => {
        this.users = members.map(m => ({
          id: m.id,                 // <-- studioMemberId (UUID) usato dalla view()
          userId: m.user.id,        // (se ti serve per update/delete utente)
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
          active: m.active,
          createdAt: (m.user as any)?.createdAt
        })) as any;
        this.applyFilter();
        this.loading = false;
      },
      error: err => {
        console.error('Errore nel caricamento dei membri', err);
        this.users = [];
        this.filtered = [];
        this.loading = false;
      }
    });
  }

  trackById(_: number, u: User & { memberId?: string }): number | string {
    return (u as any).memberId || u.id;
  }

  reload(): void { this.load(); }

  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    this.filtered = !q
      ? [...this.users]
      : this.users.filter(u =>
        [u.firstName, u.lastName, u.email, (u as any).phone, u.active ? 'attivo' : 'sospeso']
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      );
  }

  openNew(): void {
    this.editing = null;
    this.form = this.blankForm();
    this.modalVisible = true;
    this.step = 0;
  }

  /** DETTAGLIO: chiama l'API GET /members/{id} dove id è lo studioMemberId (UUID) */
  view(u: { id?: string }): void {
    if (!u?.id) {
      console.warn('[Users] view(): manca studioMemberId nella riga', u);
      return;
    }
    this.loading = true;
    this.membersSvc.getMember(u.id).subscribe({
      next: (dto) => {
        this.viewing = dto;          // StudioMemberDto dal backend
        this.detailsVisible = true;  // apro la modale
        this.loading = false;
      },
      error: (err) => {
        console.error('[Users] getMember errore', err);
        this.loading = false;
      }
    });
  }


  suspend(u: { id?: string }): void {
    console.log("A");
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.viewing = null;
  }

  edit(u: User & { memberId?: string }): void {
    this.editing = u;
    this.form = {
      firstName: (u as any).firstName ?? (u as any).firstName,
      lastName: (u as any).lastName ?? (u as any).lastName,
      email: u.email,
      phone: (u as any).phone ?? '',
      active: (u as any).active,
      memberships: []
    };
    if (this.form.memberships.length === 0) this.addMembership();
    this.modalVisible = true;
    this.step = 0;
  }

  askDelete(u: User & { memberId?: string }): void {
    this.toDelete = u;
    this.confirmVisible = true;
  }

  confirmDelete(): void {
    if (!this.toDelete) return;
    this.membersSvc.deleteMember(this.toDelete.id as any).subscribe({
      next: () => {
        this.toDelete = null;
        this.confirmVisible = false;
        this.reload();
      },
      error: err => {
        console.error('Errore durante la cancellazione del membro', err);
      }
    });
  }

  next(): void { if (this.isStepValid(this.step) && this.step < 2) this.step++; }
  prev(): void { if (this.step > 0) this.step--; }

  isStepValid(s: number): boolean {
    if (s === 0) {
      const f = this.form;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
      return !!f.firstName.trim() && !!f.lastName.trim() && !!f.email.trim() && emailOk;
    }
    if (s === 1) { return this.form.memberships.every(m => !m.studioId || !!m.role); }
    return true;
  }

  save(): void {
    if (!this.isStepValid(2)) return;
    const f = this.form;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
    if (!emailOk) return;

    const membershipsClean = f.memberships.filter(m => !!m.studioId);

    if (this.editing) {
      const updated: any = { ...this.editing, ...f, memberships: membershipsClean };
      if (!(this.editing as any).firstName && !(this.editing as any).lastName) {
        updated.name = `${f.firstName} ${f.lastName}`.trim();
      }
      this.svc.update(updated);
      this.editing = null;
    } else {
      const firstMembership = membershipsClean[0];
      const input: StudioMemberInputDto = {
        user: { firstName: f.firstName, lastName: f.lastName, email: f.email, password: (f as any).password ?? '' },
        role: (firstMembership?.role as StudioRole) ?? 'BACKOFFICE'
      };
      this.saving = true;
      this.membersSvc.createMember(input).subscribe({
        next: _ => { this.saving = false; this.detailsVisible = false; this.reload(); },
        error: e => { this.saving = false; console.error('Errore durante la creazione del membro', e); }
      });
    }

    this.modalVisible = false;
    this.reload();
  }

  addMembership(): void { this.form.memberships.push({ studioId: null, role: 'BACKOFFICE', active: true }); }
  removeMembership(i: number): void { this.form.memberships.splice(i, 1); if (this.form.memberships.length === 0) this.addMembership(); }
  trackByMembership = (_: number, m: MembershipForm) => m.studioId ?? _;

  private blankForm() {
    return { firstName: '', lastName: '', email: '', phone: '', active: true, memberships: [] as MembershipForm[] };
  }

  studioName(id: string | null): string {
    if (!id) return '';
    const s = this.studios.find(x => x.id === id);
    return s ? s.name : '';
  }
  deactivate(u: any): void {
    if (!u?.id) return;
    this.membersSvc.changeStatus(u.id, false).subscribe({
      next: () => this.reload(),
      error: err => console.error('Errore durante la disattivazione', err)
    });
  }

  deactivateFromDetails(v: any): void {
    if (!v?.id) return;
    this.membersSvc.changeStatus(v.id, false).subscribe({
      next: () => {
        this.closeDetails();
        this.reload();
      },
      error: err => console.error('Errore durante la disattivazione', err)
    });
  }

  activate(u: any): void {
    if (!u?.id) return;
    this.membersSvc.changeStatus(u.id, true).subscribe({
      next: () => this.reload(),
      error: err => console.error('Errore durante l’attivazione', err)
    });
  }

  activateFromDetails(v: any): void {
    if (!v?.id) return;
    this.membersSvc.changeStatus(v.id, true).subscribe({
      next: () => {
        this.closeDetails();
        this.reload();
      },
      error: err => console.error('Errore durante l’attivazione', err)
    });
  }


}
