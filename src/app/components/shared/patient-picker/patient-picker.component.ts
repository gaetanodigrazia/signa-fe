import {
  Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, HostListener
} from '@angular/core';
import { PatientsFacade } from 'src/app/service/patient.facade';
import { PatientDto } from 'src/app/model/patient.model';

@Component({
  selector: 'app-patient-picker',
  templateUrl: './patient-picker.component.html',
  styleUrls: ['./patient-picker.component.scss'],
})
export class PatientPickerComponent implements OnInit {
  /** Two-way binding: [(model)] */
  @Input() model: string | null = null;
  @Output() modelChange = new EventEmitter<string | null>();

  /** Quando clicchi “+” per creare un nuovo paziente */
  @Output() addRequested = new EventEmitter<void>();

  /** Placeholder input */
  @Input() placeholder = 'Cerca nome o email…';

  /** UI state */
  @ViewChild('wrap', { static: false }) wrapRef?: ElementRef<HTMLDivElement>;
  userSearch = '';
  listOpen = false;
  listOpenUp = false;
  listMaxH = 240;
  results: PatientDto[] = [];
  highlight = -1;

  private all: PatientDto[] = [];

  constructor(private facade: PatientsFacade) { }

  ngOnInit(): void {
    this.facade.items$.subscribe(items => {
      this.all = items ?? [];
      this.applyFilter(this.userSearch);
      // se ho già un model, sincronizzo label
      if (this.model) this.userSearch = this.formatLabel(this.model) || '';
    });
  }

  /* ---------- Public API ---------- */
  writeValue(id: string | null): void {
    this.model = id;
    this.modelChange.emit(this.model);
    this.userSearch = this.formatLabel(id) || '';
  }

  /* ---------- UI handlers ---------- */
  openList(): void {
    this.listOpen = true;
    this.applyFilter(this.userSearch);
    this.recomputeListPosition();
  }
  closeListSoon(): void {
    setTimeout(() => (this.listOpen = false), 120);
  }
  onSearchChange(q: string): void {
    this.applyFilter(q);
    this.listOpen = true;
    this.recomputeListPosition();
  }
  onKeydown(ev: KeyboardEvent): void {
    if (!this.listOpen || !this.results.length) return;
    if (ev.key === 'ArrowDown') {
      this.highlight = (this.highlight + 1) % this.results.length;
      ev.preventDefault();
    } else if (ev.key === 'ArrowUp') {
      this.highlight = (this.highlight + this.results.length - 1) % this.results.length;
      ev.preventDefault();
    } else if (ev.key === 'Enter') {
      if (this.highlight > -1) {
        this.pick(this.results[this.highlight]);
        ev.preventDefault();
      }
    } else if (ev.key === 'Escape') {
      this.listOpen = false;
    }
  }

  pick(p: PatientDto): void {
    this.writeValue(p.id);
    this.listOpen = false;
  }

  requestAdd(): void {
    this.addRequested.emit();
  }

  /* ---------- Utils ---------- */
  private applyFilter(q: string): void {
    const s = (q || '').trim().toLowerCase();
    const base = this.all;
    this.results = s
      ? base.filter(p =>
        (p.firstname && p.firstname.toLowerCase().includes(s)) ||
        (p.lastname && p.lastname.toLowerCase().includes(s)) ||
        (p.email && p.email.toLowerCase().includes(s)))
      : [...base];
    this.results = this.results.slice(0, 20);
    this.highlight = this.results.length ? 0 : -1;
  }

  private formatLabel(id: string | null | undefined): string | null {
    const p = this.facade.findByIdSync(id || null);
    if (!p) return null;
    const name = [p.firstname, p.lastname].filter(Boolean).join(' ');
    return `${name || 'Senza nome'} — ${p.email || 'n/d'}`;
  }

  private recomputeListPosition(): void {
    const el = this.wrapRef?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 16;
    const below = window.innerHeight - rect.bottom - margin;
    const above = rect.top - margin;
    const desired = 320;

    if (below < 220 && above > below) {
      this.listOpenUp = true;
      this.listMaxH = Math.max(180, Math.min(desired, above - 8));
    } else {
      this.listOpenUp = false;
      this.listMaxH = Math.max(180, Math.min(desired, below - 8));
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.listOpen) this.recomputeListPosition();
  }
}
