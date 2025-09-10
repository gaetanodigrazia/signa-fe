// error-modal.component.ts
import { Component, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorModalService } from 'src/app/service/error-modal.service';

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-modal.component.html',
  styleUrls: ['./error-modal.component.scss']
})
export class ErrorModalComponent {
  @ViewChild('closeBtn') closeBtn!: ElementRef<HTMLButtonElement>;

  constructor(public errorModal: ErrorModalService) {
    // Focus e body scroll lock
    this.errorModal.state$.subscribe(err => {
      if (err) {
        setTimeout(() => this.closeBtn?.nativeElement?.focus(), 0);
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  close() { this.errorModal.close(); }
  stop(ev: Event) { ev.stopPropagation(); }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape') this.close();
  }
}
