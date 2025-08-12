import { Component, HostListener, Input } from '@angular/core';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent {
  @Input() collapsed = false;

  notifCount = 3;
  profileOpen = false;
  notifOpen = false;

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (!t.closest('.tb-menu') && !t.closest('.tb-dropdown')) {
      this.profileOpen = false;
      this.notifOpen = false;
    }
  }

  toggleProfile(e: MouseEvent) {
    e.stopPropagation();
    this.profileOpen = !this.profileOpen;
    this.notifOpen = false;
  }

  toggleNotif(e: MouseEvent) {
    e.stopPropagation();
    this.notifOpen = !this.notifOpen;
    this.profileOpen = false;
  }
}
