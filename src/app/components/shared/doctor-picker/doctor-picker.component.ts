import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges,
  ViewChild, ElementRef, HostListener
} from '@angular/core';
import { StudioMemberDto } from 'src/app/service/studiomembers.service';

@Component({
  selector: 'app-doctor-picker',
  templateUrl: './doctor-picker.component.html',
  styleUrls: ['./doctor-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DoctorPickerComponent implements OnChanges {
  /* ==== API ==== */
  @Input() doctors: StudioMemberDto[] = [];
  @Input() placeholder = 'Seleziona dottore…';
  @Input() showAdd = false;
  @Input() disabled = false;
  @Input() model: string | null = null;                  // <-- StudioMemberDto.id
  @Output() modelChange = new EventEmitter<string | null>();
  @Output() addRequested = new EventEmitter<void>();

  /* ==== UI state ==== */
  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;
  listOpen = false;
  listOpenUp = false;
  listMaxH = 240;
  search = '';
  results: StudioMemberDto[] = [];
  highlight = -1;

  constructor(private cdr: ChangeDetectorRef) { }

  /* ==== Lifecycle ==== */
  ngOnChanges(ch: SimpleChanges): void {
    if (ch['doctors']) this.recomputeResults(this.search);
    if (ch['model']) this.syncInputWithModel();
    this.cdr.markForCheck();
  }

  /* ==== Template handlers ==== */
  openList(): void {
    if (this.disabled) return;
    this.listOpen = true;
    this.recomputeResults(this.search);
    this.recomputeListPosition();
  }
  closeListSoon(): void {
    setTimeout(() => { this.listOpen = false; this.cdr.markForCheck(); }, 120);
  }
  onSearchChange(q: string): void {
    this.search = q || '';
    this.recomputeResults(this.search);
  }
  onKeydown(ev: KeyboardEvent): void {
    if (!this.listOpen || !this.results.length) return;
    if (ev.key === 'ArrowDown') { this.highlight = (this.highlight + 1) % this.results.length; ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { this.highlight = (this.highlight + this.results.length - 1) % this.results.length; ev.preventDefault(); }
    else if (ev.key === 'Enter' && this.highlight > -1) { this.pick(this.results[this.highlight]); ev.preventDefault(); }
    else if (ev.key === 'Escape') { this.listOpen = false; }
    this.cdr.markForCheck();
  }
  requestAdd(): void { if (!this.disabled) this.addRequested.emit(); }

  pick(d: StudioMemberDto): void {
    const id = d?.id ?? null;                // <— usa l’ID del membro
    this.model = id;
    this.modelChange.emit(id);
    this.search = this.labelOf(d);
    this.listOpen = false;
    this.cdr.markForCheck();
  }

  /* ==== Logic ==== */
  private recomputeResults(q: string): void {
    const s = (q || '').trim().toLowerCase();
    const base = (this.doctors ?? []).filter(m => m.role === 'DOCTOR' && m.active !== false);
    let next = base;
    if (s) {
      next = base.filter(m => {
        const fn = m.user?.firstName?.toLowerCase() || '';
        const ln = m.user?.lastName?.toLowerCase() || '';
        const em = m.user?.email?.toLowerCase() || '';
        return fn.includes(s) || ln.includes(s) || em.includes(s);
      });
    }
    this.results = next.slice(0, 50);
    this.highlight = this.results.length ? 0 : -1;
    this.cdr.markForCheck();
  }

  private syncInputWithModel(): void {
    const d = this.doctors?.find(x => x.id === this.model);
    this.search = d ? this.labelOf(d) : '';
  }

  private labelOf(d: StudioMemberDto): string {
    const full = [d.user?.firstName, d.user?.lastName].filter(Boolean).join(' ').trim();
    return full || d.user?.email || '—';
  }

  private recomputeListPosition(): void {
    const el = this.wrapRef?.nativeElement; if (!el) return;
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

  @HostListener('window:resize') onWindowResize(): void {
    if (this.listOpen) this.recomputeListPosition();
  }
}
