import { Component, HostListener } from '@angular/core';
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
  constructor(public errorModal: ErrorModalService) { }

  // chiudi con ESC
  @HostListener('document:keydown.escape')
  onEsc() { this.errorModal.close(); }

  stop(e: Event) { e.stopPropagation(); }
}
