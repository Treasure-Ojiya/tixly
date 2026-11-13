import {
  Component,
  ElementRef,
  inject,
  HostListener,
  OnInit,
} from '@angular/core';
import {
  Router,
  NavigationEnd,
  RouterLink,
  RouterLinkActive,
  ActivatedRoute,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth-service/auth-service';
import { SearchBar } from '../search-bar/search-bar';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, SearchBar],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'], // ✅ corrected "styleUrl" → "styleUrls"
})
export class Navbar implements OnInit {
  scrolled = false;
  isHomePage = true;
  menuOpen = false;
  isLoggedIn = false;
  showDropdown = false;
  showNavbar = true;
  createMenuOpen = false;
  searchOpen = false;

  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private host = inject(ElementRef<HTMLElement>);

ngOnInit(): void {
  this.authService.isLoggedIn$.subscribe((loggedIn) => {
    this.isLoggedIn = loggedIn;
  });

  // Set the correct state immediately on page load.
  this.updateRouteState();

  this.router.events
    .pipe(
      filter(
        (event): event is NavigationEnd => event instanceof NavigationEnd,
      ),
    )
    .subscribe(() => {
      this.updateRouteState();
    });
}

private updateRouteState(): void {
  const currentUrl = this.router.url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

  this.isHomePage = currentUrl === '/' || currentUrl === '/home';

  let currentRoute = this.router.routerState.snapshot.root;

  while (currentRoute.firstChild) {
    currentRoute = currentRoute.firstChild;
  }

  this.showNavbar = !currentRoute.data['hideLayout'];

  // Only the homepage uses the scroll-based navbar styling.
  this.scrolled = this.isHomePage && window.scrollY > 50;

  this.closeMenu();
}



  navLinks = [
  { label: 'Home', path: '/home', icon: 'home' },
  { label: 'Explore', path: '/explore', icon: 'explore' },
      // { label: 'Spaces', path: '/spaces' },

  { label: 'Queue', path: '/queue', icon: 'ticket' },
];

  createMenuItems = [
    {
      path: '/events/organizer/dashboard',
      icon: 'fa-ticket-alt',
      title: 'Host an Event',
      subtitle: 'Create and sell tickets',
    },
    // {
    //   path: '/listings/provider',
    //   icon: 'fa-building',
    //   title: 'List a Space',
    //   subtitle: 'Rent out your venue',
    // },
  ];

  // ✅ Helper to find deepest child route (important for nested routing)
  private getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    while (route.firstChild) route = route.firstChild;
    return route;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.scrolled = window.scrollY > 50;
  }

  goToAuth() {
    this.router.navigate(['auth/authentication']);
  }

  logout(): void {
    this.authService.logoutUser().subscribe({
      next: () => {
        this.router.navigate(['/auth/authentication']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
        this.router.navigate(['/auth/authentication']);
      },
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleSearch(event: Event): void {
    event.stopPropagation();
    this.searchOpen = !this.searchOpen;
    this.menuOpen = false;
    this.showDropdown = false;
    this.createMenuOpen = false;
  }

  closeSearch(): void {
    this.searchOpen = false;
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.createMenuOpen = false;
    this.searchOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.searchOpen = false;
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    this.createMenuOpen = false;
    this.searchOpen = false;
  }

  toggleCreateMenu(event: Event): void {
    event.stopPropagation();
    this.createMenuOpen = !this.createMenuOpen;
    this.showDropdown = false;
    this.searchOpen = false;
  }
  closeDropdown() {
    this.showDropdown = false;
  }

  closeCreateMenu(): void {
    this.createMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!this.host.nativeElement.contains(target)) {
      this.menuOpen = false;
      this.showDropdown = false;
      this.createMenuOpen = false;
      this.searchOpen = false;
    }
  }
}
