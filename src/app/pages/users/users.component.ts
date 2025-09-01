import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from 'src/app/model/user.model';
import { StudioMembersService, StudioMemberInputDto, StudioRole, StudioMemberDto } from 'src/app/service/studiomembers.service';

interface MembershipForm { studioId: string | null; role: StudioRole; active: boolean; }
interface Studio { id: string; name: string; }
type EditMode = 'none' | 'personal' | 'role';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  // Lista & filtro
  users: (User & { memberId?: string })[] = [];
  filtered: (User & { memberId?: string })[] = [];
  search = '';

  // Modali & stato UI
  modalVisible = false;
  detailsVisible = false;
  confirmVisible = false;
  saving = false;
  loading = false;

  // Creazione: wizard 3 step (0 = anagrafica, 1 = ruolo, 2 = riepilogo)
  step: 0 | 1 | 2 = 0;

  // Modifica
  editingId: string | null = null;   // studioMemberId (UUID) in modifica
  editMode: EditMode = 'none';       // scelta cosa modificare
  viewing: StudioMemberDto | null = null;
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
    memberships: MembershipForm[];
  } = this.blankForm();

  constructor(
    private membersSvc: StudioMembersService
  ) { }

  ngOnInit(): void {
    this.load();
  }

  /* ---------- Lista ---------- */

  load(): void {
    this.loading = true;
    this.membersSvc.listMembers().subscribe({
      next: (members: StudioMemberDto[]) => {
        this.users = members.map(m => ({
          id: m.id,                     // studioMemberId (UUID)
          userId: m.user.id,            // id utente
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

  trackById(_: number, u: any): string | number {
    return u?.id ?? _;
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

  /* ---------- Creazione ---------- */

  openNew(): void {
    this.editingId = null;
    this.viewing = null;
    this.editMode = 'none';
    this.form = this.blankForm();
    this.modalVisible = true;
    this.step = 0;
  }

  next(): void { if (this.isStepValid(this.step) && this.step < 2) this.step++; }
  prev(): void { if (this.step > 0) this.step--; }

  isStepValid(s: number): boolean {
    if (s === 0) {
      const f = this.form;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
      return !!f.firstName.trim() && !!f.lastName.trim() && !!f.email.trim() && emailOk;
    }
    if (s === 1) {
      // almeno se presente studioId deve esserci un ruolo
      return this.form.memberships.every(m => !m.studioId || !!m.role);
    }
    if (s === 2) {
      // riepilogo: niente validazioni ulteriori
      return true;
    }
    return true;
  }

  save(): void {
    if (!this.isStepValid(2)) return;
    const f = this.form;

    const firstMembership = f.memberships[0];
    const input: StudioMemberInputDto = {
      user: {
        firstName: f.firstName,
        lastName: f.lastName,
        email: f.email,
        password: (f as any).password ?? ''
      },
      role: (firstMembership?.role as StudioRole) ?? 'BACKOFFICE'
    };

    this.saving = true;
    this.membersSvc.createMember(input).subscribe({
      next: _ => {
        this.saving = false;
        this.modalVisible = false;
        this.reload();
      },
      error: e => {
        console.error('Errore durante la creazione del membro', e);
        this.saving = false;
      }
    });
  }

  /* ---------- Dettaglio ---------- */

  view(u: { id?: string }): void {
    if (!u?.id) {
      console.warn('[Users] view(): manca studioMemberId nella riga', u);
      return;
    }
    this.loading = true;
    this.membersSvc.getMember(u.id).subscribe({
      next: (dto) => {
        this.viewing = dto;
        this.detailsVisible = true;  // apre la modale dettagli
        this.loading = false;
      },
      error: (err) => {
        console.error('[Users] getMember errore', err);
        this.loading = false;
      }
    });
  }

  closeDetails(): void {
    this.detailsVisible = false;
    this.viewing = null;
  }

  /* ---------- Modifica ---------- */

  edit(u: { id?: string }): void {
    if (!u?.id) {
      console.warn('[Users] edit(): manca studioMemberId nella riga', u);
      return;
    }
    this.loading = true;
    this.membersSvc.getMember(u.id).subscribe({
      next: (dto: StudioMemberDto) => {
        this.editingId = dto.id;         // salvo l'id del member
        this.fillFormFromDto(dto);       // pre-compilo form
        this.modalVisible = true;        // apro modale
        this.editMode = 'none';          // chiedo la scelta
        this.loading = false;
      },
      error: err => {
        console.error('[Users] getMember (per edit) errore', err);
        this.loading = false;
      }
    });
  }

  editFromDetails(dto: StudioMemberDto | null): void {
    if (!dto?.id) return;
    this.editingId = dto.id;
    this.fillFormFromDto(dto);
    this.modalVisible = true;
    this.editMode = 'none';
    this.step = 0;
    this.closeDetails();
  }

  chooseEdit(mode: EditMode) {
    this.editMode = mode;
  }

  isEditValid(): boolean {
    if (!this.editingId || this.editMode === 'none') return false;
    return this.editMode === 'personal' ? this.isStepValid(0) : this.isStepValid(1);
  }

  confirmEdit(): void {
    if (!this.editingId || !this.isEditValid()) return;

    const f = this.form;
    let payload: StudioMemberInputDto;

    if (this.editMode === 'personal') {
      // Aggiorna solo anagrafica; ruolo resta quello attuale
      payload = {
        user: { firstName: f.firstName, lastName: f.lastName, email: f.email, password: '' },
        role: (this.viewing?.role ?? f.memberships?.[0]?.role ?? 'BACKOFFICE') as StudioRole
      };
    } else {
      // Aggiorna solo ruolo; anagrafica resta quella corrente
      payload = {
        user: {
          firstName: this.viewing?.user.firstName ?? f.firstName,
          lastName: this.viewing?.user.lastName ?? f.lastName,
          email: this.viewing?.user.email ?? f.email,
          password: ''
        },
        role: (f.memberships?.[0]?.role as StudioRole) ?? (this.viewing?.role as StudioRole) ?? 'BACKOFFICE'
      };
    }

    this.saving = true;
    this.membersSvc.updateMember(String(this.editingId), payload).subscribe({
      next: () => {
        this.saving = false;
        this.modalVisible = false;
        this.editingId = null;
        this.editMode = 'none';
        this.load();
      },
      error: err => {
        console.error('[Users] updateMember error', err);
        this.saving = false;
      }
    });
  }

  cancelModal(): void {
    this.modalVisible = false;
    this.editingId = null;
    this.editMode = 'none';
  }

  /* ---------- Stato attivo/sospeso ---------- */

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
      next: () => { this.closeDetails(); this.reload(); },
      error: err => console.error('Errore durante la disattivazione', err)
    });
  }

  activate(u: any): void {
    console.log("Called this");
    if (!u?.id) return;
    this.membersSvc.changeStatus(u.id, true).subscribe({
      next: () => this.reload(),
      error: err => console.error('Errore durante l’attivazione', err)
    });
  }

  activateFromDetails(v: any): void {
    console.log("Or Called this");
    if (!v?.id) return;
    this.membersSvc.changeStatus(v.id, true).subscribe({
      next: () => { this.closeDetails(); this.reload(); },
      error: err => console.error('Errore durante l’attivazione', err)
    });
  }

  /* ---------- Utilità ---------- */

  private blankForm() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      memberships: [] as MembershipForm[]
    };
  }

  private fillFormFromDto(dto: StudioMemberDto): void {
    this.form = {
      firstName: dto.user.firstName || '',
      lastName: dto.user.lastName || '',
      email: dto.user.email || '',
      phone: (dto.user as any).phone || '',
      memberships: [{
        studioId: (dto as any).studioId ?? null,
        role: dto.role,
        active: dto.active === true
      }]
    };
  }

  addMembership(): void {
    this.form.memberships.push({ studioId: null, role: 'BACKOFFICE', active: true });
  }

  removeMembership(i: number): void {
    this.form.memberships.splice(i, 1);
    if (this.form.memberships.length === 0) this.addMembership();
  }

  trackByMembership = (_: number, m: MembershipForm) => m.studioId ?? _;

  studioName(id: string | null): string {
    if (!id) return '';
    const s = this.studios.find(x => x.id === id);
    return s ? s.name : '';
  }

  askDelete(u: { id?: string; firstName?: string; lastName?: string }): void {
    if (!u?.id) return;
    this.toDelete = u as any;
    this.confirmVisible = true;
  }

  askDeleteFromDetails(v: StudioMemberDto): void {
    if (!v?.id) return;
    // preparo un oggetto "compatibile" con la conferma
    this.toDelete = {
      id: v.id,
      firstName: v.user?.firstName,
      lastName: v.user?.lastName
    } as any;
    this.confirmVisible = true;
  }

  confirmDelete(): void {
    if (!this.toDelete?.id) return;
    this.saving = true;
    this.membersSvc.deleteMember(String(this.toDelete.id)).subscribe({
      next: () => {
        this.saving = false;
        this.confirmVisible = false;
        this.toDelete = null;
        // chiudi eventuale modale dettagli aperta
        this.detailsVisible = false;
        this.viewing = null;
        this.reload();
      },
      error: (err) => {
        console.error('Errore durante la cancellazione del membro', err);
        this.saving = false;
      }
    });
  }

}
