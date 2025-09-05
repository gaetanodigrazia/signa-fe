import { Component, HostListener, Output, EventEmitter, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { StudioRole } from 'src/app/service/studiomembers.service';
import { inject, effect } from '@angular/core';
import { LoggedUserStore } from 'src/app/auth/service/logged-user.store';
import { PageKey } from 'src/app/auth/model/auth.model';

const LS_LOCKED = 'app_locked';
const LS_RETURN_URL = 'app_locked_return_url';
const LS_TOKEN = 'app_token'; // cambia se usi una chiave diversa per il token
const STUDIO_ROLE = 'studio_role'; // cambia se usi una chiave diversa per il token

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  private store = inject(LoggedUserStore);
  user = this.store.user;
  allowedPages: PageKey[];
  private allowedSet = new Set<PageKey>();

  settingsPage: boolean = false;

  isMobile = false;
  menuOpen = false;
  isCollapsed = false;
  studioRole: StudioRole;
  isDoctor: boolean = false;
  isBackoffice: boolean = false;

  @Output() collapseChanged = new EventEmitter<boolean>();

  // stato selezionato dai query params (default 'active')
  status$ = this.route.queryParamMap.pipe(
    map(q => (q.get('status') ?? 'active')),
    distinctUntilChanged()
  );

  // costruttore (aggiungi ActivatedRoute)
  constructor(private router: Router, private route: ActivatedRoute) {
    this.studioRole = <StudioRole>localStorage.getItem(STUDIO_ROLE);
    effect(() => {
      const u = this.user(); // legge il signal
      const pages = u?.permissions?.pages ?? [];
      this.syncAllowed(pages);
      this.settingsPage = this.can('SETTINGS');

      // se il ruolo sta nello user, aggiorna anche questi flag in modo reattivo
      const role = (u as any)?.role ?? this.studioRole;
      this.isDoctor = role === 'DOCTOR';
      this.isBackoffice = role === 'BACKOFFICE';
    });
  }
  /** Aggiorna array e Set evitando ricreazioni inutili */
  private syncAllowed(pages: PageKey[]) {
    this.allowedPages = pages;
    this.allowedSet = new Set<PageKey>(pages);
  }

  /** API comoda e veloce per il template */
  can(page: PageKey): boolean {
    return this.allowedSet.has(page);
  }

  checkIfDoctor() {
    if (this.studioRole === 'DOCTOR') {
      this.isDoctor = true;
    }
  }
  checkIfBackoffice() {
    if (this.studioRole === 'BACKOFFICE') {
      this.isBackoffice = true;
    }
  }
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
  // stato desktop
  appointmentsOpen = false;

  // stato mobile
  appointmentsOpenMobile = false;

  // toggle desktop
  toggleAppointments(): void {
    this.appointmentsOpen = !this.appointmentsOpen;
  }

  // se già hai closeSubmenus(), assicurati che chiuda anche Appuntamenti
  closeSubmenus(): void {
    this.patientsOpen = false;
    this.appointmentsOpen = false;
    // ... lascia invariato il resto se ne hai altri
  }

  // per mobile hai già closeMobileMenu(); se vuoi richiudere anche i sub:
  closeMobileMenu(): void {
    this.menuOpen = false;
    this.patientsOpenMobile = false;
    this.appointmentsOpenMobile = false;
  }



}

