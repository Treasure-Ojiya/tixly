import { Component, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ScrollService } from '../../../core/services/scroll-service';

interface FooterLink {
  label: string;
  route?: string;
  sectionId?: string;
  href?: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css'],
})
export class Footer implements OnInit {
  showFooter = true;

  private router = inject(Router);
  private scrollService = inject(ScrollService);

  readonly currentYear = new Date().getFullYear();

  footerSections: FooterSection[] = [
    {
      title: 'Events',
      links: [
        { label: 'Find Events', route: '/explore' },
        { label: 'Create Event', route: '/events/organizer/create-event' },
        { label: 'Your Queue', route: '/queue' },
      ],
    },
    {
      title: 'Organization',
      links: [
        { label: 'Our Services', sectionId: 'serve' },
        { label: 'About', route: '/about' },
        { label: 'Contact', route: '/contact' },
      ],
    },
    {
      title: 'Follow Us',
      links: [
        { label: 'Facebook', href: '#' },
        { label: 'Twitter', href: '#' },
        { label: 'Instagram', href: '#' },
      ],
    },
  ];

  ngOnInit(): void {
    this.updateFooterState();

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe(() => {
        this.updateFooterState();
      });
  }

  private updateFooterState(): void {
    let currentRoute = this.router.routerState.snapshot.root;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    this.showFooter = !currentRoute.data['hideLayout'];
  }

  onScroll(sectionId: string, event: Event): void {
    event.preventDefault();
    this.scrollService.goToSection(sectionId);
  }
}