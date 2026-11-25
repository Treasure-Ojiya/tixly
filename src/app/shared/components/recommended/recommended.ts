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

import {
  UserRecommended,
  EventListItem,
  EventModel,
} from '../../../app-model/model';
import { UserService } from '../../../core/services/user-service/user-service';

const MAX_SLIDES = 8;

@Component({
  selector: 'app-recommended',
  imports: [RouterLink, DatePipe],
  templateUrl: './recommended.html',
  styleUrl: './recommended.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Recommended {
  private userService = inject(UserService);

  recommended = signal<UserRecommended[]>([]);
  isLoading = signal(true);

  startingPrices = signal<Record<string, number>>({});

  private swiperStarted = false;

  constructor() {
    this.loadRecommended();
  }

  private loadRecommended(): void {
    this.userService
      .getRecommended(20)
      .pipe(
        catchError((error) => {
          console.error('Failed to load recommended events:', error);
          return of([] as UserRecommended[]);
        }),
      )
      .subscribe((events) => {
        this.recommended.set(events.slice(0, MAX_SLIDES));
        this.isLoading.set(false);
      });
  }

  private cheapestTicket(event: EventModel): number | null {
    const available = event.ticket_types.filter(
      (t) => t.available_quantity > 0,
    );
    const pool = available.length ? available : event.ticket_types;
    return pool.length ? Math.min(...pool.map((t) => t.price)) : null;
  }

  priceFor(event: EventListItem): number | null {
    return event.starting_price ?? this.startingPrices()[event.uuid] ?? null;
  }

  formatPrice(amount: number): string {
    return `₦${amount.toLocaleString('en-NG')}`;
  }

  @ViewChild('swiper')
  set swiperRef(ref: ElementRef | undefined) {
    if (ref && !this.swiperStarted) {
      this.swiperStarted = true;
      this.startSwiper(ref.nativeElement);
    }
  }

  private startSwiper(
    swiperEl: HTMLElement & { initialize?: () => void },
  ): void {
    Object.assign(swiperEl, {
      breakpoints: {
        0: { slidesPerView: 1.2, spaceBetween: 16 },
        640: { slidesPerView: 2.2, spaceBetween: 18 },
        1024: { slidesPerView: 3, spaceBetween: 20 },
      },
    });

    setTimeout(() => swiperEl.initialize?.(), 0);
  }
}
