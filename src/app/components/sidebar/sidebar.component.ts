import { Component, HostListener, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  isMobile = false;
  menuOpen = false;
  isCollapsed = false;
  @Output() collapseChanged = new EventEmitter<boolean>();

  @HostListener('window:resize', [])
  onResize() {
    this.isMobile = window.innerWidth <= 768;
  }

  ngOnInit() {
    this.onResize();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.collapseChanged.emit(this.isCollapsed);
  }
}
