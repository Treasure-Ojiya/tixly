import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OrganizerService } from '../../../../core/services/organizer-service/organizer-service';
import { EventListItem } from '../../../../app-model/model';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private organizerService = inject(OrganizerService);

  events = signal<EventListItem[]>([]);
  isLoading = signal(true);
  loadError = signal('');

  // Total events, regardless of status.
  totalEvents = computed(() => this.events().length);

  // Published events.
  activeEvents = computed(
    () =>
      this.events().filter(
        (event) => event.status?.toLowerCase() === 'published',
      ).length,
  );

  // Published events with a future date.
  upcomingEvents = computed(
    () =>
      this.events().filter(
        (event) =>
          event.status?.toLowerCase() === 'published' &&
          new Date(event.event_date).getTime() > Date.now(),
      ).length,
  );

  // Total tickets sold across all the organizer's events.
  ticketsSold = computed(() =>
    this.events().reduce(
      (total, event) => total + (Number(event.tickets_sold) || 0),
      0,
    ),
  );

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.organizerService.getMyEvents().subscribe({
      next: (events) => {
        this.events.set(events ?? []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load dashboard events:', error);
        this.loadError.set('Unable to load your dashboard figures.');
        this.isLoading.set(false);
      },
    });
  }
}
