import { Component, HostListener, Output, EventEmitter, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, distinctUntilChanged } from 'rxjs/operators';

const LS_LOCKED = 'app_locked';
const LS_RETURN_URL = 'app_locked_return_url';
const LS_TOKEN = 'app_token'; // cambia se usi una chiave diversa per il token

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  isMobile = false;
  menuOpen = false;
  isCollapsed = false;
  @Output() collapseChanged = new EventEmitter<boolean>();

  // stato selezionato dai query params (default 'active')
  status$ = this.route.queryParamMap.pipe(
    map(q => (q.get('status') ?? 'active')),
    distinctUntilChanged()
  );

  // costruttore (aggiungi ActivatedRoute)
  constructor(private router: Router, private route: ActivatedRoute) { }
  ngOnInit() {
    this.onResize();
  }

  @HostListener('window:resize', [])
  onResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;
    // se torno desktop, chiudo il menu mobile
    if (wasMobile && !this.isMobile) {
      this.menuOpen = false;
    }
  }
  private scrollY = 0;

  private lockBodyScroll() {
    this.scrollY = window.scrollY || window.pageYOffset;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  private unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, this.scrollY);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) this.lockBodyScroll();
    else this.unlockBodyScroll();
  }


  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.collapseChanged.emit(this.isCollapsed);
  }

  logout(): void {
    try {
      localStorage.removeItem('app_token');
      localStorage.removeItem('app_locked');
      localStorage.removeItem('app_locked_return_url');
    } finally {
      if (this.isMobile) this.menuOpen = false;
      this.router.navigate(['/login'], { replaceUrl: true }); // <— importante
    }
  }

  /** Blocca la sessione: salva URL corrente, imposta locked e vai a /lock */
  lockScreen(): void {
    const currentUrl = this.router.url || '/home';
    localStorage.setItem(LS_LOCKED, 'true');
    localStorage.setItem(LS_RETURN_URL, currentUrl);

    if (this.isMobile) this.menuOpen = false;
    this.router.navigateByUrl('/lock');
  }
  // stato submenu
  patientsOpen = false;
  patientsOpenMobile = false;

  togglePatients() {
    if (this.isCollapsed) {
      // con sidebar collassata, vai direttamente alla lista
      this.router.navigate(['/patients']);
      return;
    }
    this.patientsOpen = !this.patientsOpen;
  }

  closeSubmenus() {
    this.patientsOpen = false;
  }

  closeMobileMenu() {
    this.patientsOpenMobile = false;
    this.menuOpen = false; // già presente nel tuo componente
  }


}

