
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { EventListItem, EventModel } from '../../../app-model/model';
import { ExploreService } from '../../../core/services/explore-service/explore-service';

const MAX_SLIDES = 8;

@Component({
  selector: 'app-upcoming',
  imports: [RouterLink, DatePipe],
  templateUrl: './upcoming.html',
  styleUrl: './upcoming.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Upcoming {
  private exploreService = inject(ExploreService);

  events = signal<EventListItem[]>([]);
  isLoading = signal(true);

  private swiperStarted = false;

  @ViewChild('swiper')
  set swiperRef(ref: ElementRef | undefined) {
    if (ref && !this.swiperStarted) {
      this.swiperStarted = true;
      this.startSwiper(ref.nativeElement);
    }
  }

  constructor() {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.exploreService
      .getEvents({})
      .pipe(
        catchError(error => {
          console.error('Failed to load upcoming events:', error);
          return of([] as EventListItem[]);
        })
      )
      .subscribe(list => {
        this.events.set(this.upcoming(list));
        this.isLoading.set(false);
      });
  }

  // Events that have not happened yet, soonest first.
  private upcoming(list: EventListItem[]): EventListItem[] {
    const now = Date.now();

    return list
      .filter(event => new Date(event.event_date).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.event_date).getTime() -
          new Date(b.event_date).getTime()
      )
      .slice(0, MAX_SLIDES);
  }

priceFor(event: EventListItem): number | null {
  return event.starting_price ?? null;
}

formatPrice(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

  private startSwiper(
    swiperEl: HTMLElement & { initialize?: () => void }
  ): void {
    Object.assign(swiperEl, {
      breakpoints: {
        0: { slidesPerView: 1.2, spaceBetween: 16 },
        640: { slidesPerView: 2.2, spaceBetween: 18 },
        1024: { slidesPerView: 3, spaceBetween: 20 },
      },
      navigation: {
        prevEl: '#upcoming-prev',
        nextEl: '#upcoming-next',
      },
      pagination: {
        clickable: true,
      },
    });

    setTimeout(() => swiperEl.initialize?.(), 0);
  }
}
