import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener
} from '@angular/core';
import { PatientDto } from 'src/app/model/patient.model';

@Component({
  selector: 'app-patient-picker',
  templateUrl: './patient-picker.component.html',
  styleUrls: ['./patient-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientPickerComponent implements OnChanges {
  /* ==== API ==== */
  @Input() patients: PatientDto[] = [];
  @Input() placeholder = 'Cerca paziente…';
  @Input() model: string | null = null;             // id paziente selezionato
  @Output() modelChange = new EventEmitter<string | null>();
  @Output() addRequested = new EventEmitter<void>();

  /* ==== Stato UI (coerente con l’HTML) ==== */
  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;

  userSearch = '';
  listOpen = false;
  listOpenUp = false;
  results: PatientDto[] = [];
  highlight = -1;
  listMaxH = 240;

  constructor(private cdr: ChangeDetectorRef) { }

  /* ===== Lifecycle ===== */
  ngOnChanges(ch: SimpleChanges): void {
    // 1) Se cambia la lista pazienti, ricalcola i risultati
    if (ch['patients']) {
      this.recomputeResults(this.userSearch);
    }

    // 2) Se cambia il modello selezionato (es. padre imposta l’id appena creato),
    // aggiorna l’etichetta mostrata nell’input.
    if (ch['model']) {
      this.syncUserSearchWithModel();
    }

    this.cdr.markForCheck(); // necessario con OnPush
  }

  /* ===== Eventi dal template ===== */
  openList(): void {
    this.listOpen = true;
    this.recomputeResults(this.userSearch);
    this.recomputeListPosition();
  }

  closeListSoon(): void {
    setTimeout(() => {
      this.listOpen = false;
      this.cdr.markForCheck();
    }, 120);
  }

  onSearchChange(q: string): void {
    this.userSearch = q || '';
    this.recomputeResults(this.userSearch);
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
    this.cdr.markForCheck();
  }

  requestAdd(): void {
    this.addRequested.emit(); // il padre aprirà la modale "Nuovo paziente"
  }

  pick(p: PatientDto): void {
    const id = p?.id ?? null;
    this.model = id;
    this.modelChange.emit(id);
    this.userSearch = this.formatLabel(p);
    this.listOpen = false;
    this.cdr.markForCheck();
  }

  /* ===== Logica ===== */
  private recomputeResults(q: string): void {
    const s = (q || '').trim().toLowerCase();

    const base = this.patients ?? [];
    let next = base;

    if (s) {
      next = base.filter(p =>
        (p.firstname && p.firstname.toLowerCase().includes(s)) ||
        (p.lastname && p.lastname.toLowerCase().includes(s)) ||
        (p.email && p.email.toLowerCase().includes(s)) ||
        (p.SSN && p.SSN.toLowerCase().includes(s))
      );
    }

    this.results = next.slice(0, 50);
    this.highlight = this.results.length ? 0 : -1;
    this.cdr.markForCheck();
  }

  private syncUserSearchWithModel(): void {
    const p = this.patients?.find(x => x.id === this.model);
    if (p) {
      // Mostra il nome selezionato nell’input
      this.userSearch = this.formatLabel(p);
    } else if (!this.model) {
      // nessuna selezione
      this.userSearch = '';
    }
  }

  private formatLabel(p: PatientDto): string {
    const full = [p.firstname, p.lastname].filter(Boolean).join(' ').trim();
    return full || p.email || '—';
  }

  private recomputeListPosition(): void {
    const el = this.wrapRef?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 16;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const desired = 320;

    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      this.listOpenUp = true;
      this.listMaxH = Math.max(180, Math.min(desired, spaceAbove - 8));
    } else {
      this.listOpenUp = false;
      this.listMaxH = Math.max(180, Math.min(desired, spaceBelow - 8));
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.listOpen) this.recomputeListPosition();
  }
}
