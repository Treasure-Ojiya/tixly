import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { OrganizerService } from '../../../../core/services/organizer-service/organizer-service';
import {
  BookedEventOrderId,
  EventBookingProperty,
} from '../../../../app-model/model';
import { OrderDetailsModal } from '../../../../shared/modals/order-details-modal/order-details-modal';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [DatePipe, NgClass],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private organizerService = inject(OrganizerService);
  private dialog = inject(MatDialog);

  @Input({ required: true }) eventId!: string;

  // State for the table
  orders = signal<BookedEventOrderId[]>([]);

  // State to hold the rich details for the modal
  private detailedOrders = signal<EventBookingProperty[]>([]);

  isLoading = signal(true);
  error = signal('');

  // Stats
  totalOrders = signal(0);
  pendingOrders = signal(0);
  completedOrders = signal(0);
  checkedInCount = signal(0);

  ngOnInit(): void {
    console.log('Orders component initialized');
    console.log('Event ID:', this.eventId);

    if (!this.eventId) {
      this.isLoading.set(false);
      this.error.set('No event selected.');
      return;
    }

    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.error.set('');

    // Fetch both at the same time using forkJoin (or just fetch them sequentially)
    // Here, we fetch the summary list for the table, and the detailed list for the modal.
    this.organizerService.getEventOrders(this.eventId).subscribe({
      next: (summaryOrders) => {
        this.orders.set(summaryOrders);
        this.totalOrders.set(summaryOrders.length);
        this.pendingOrders.set(
          summaryOrders.filter((o) => o.status.toLowerCase() === 'pending')
            .length,
        );
        this.completedOrders.set(
          summaryOrders.filter(
            (o) =>
              o.status.toLowerCase() === 'completed' ||
              o.status.toLowerCase() === 'paid',
          ).length,
        );

        // Now fetch the detailed properties (which includes attendees and check-in status)
        this.organizerService
          .getEventBookingProperties(this.eventId)
          .subscribe({
            next: (details) => {
              this.detailedOrders.set(details);
              this.checkedInCount.set(
                details.filter((d) => d.checked_in).length,
              );
              this.isLoading.set(false);
            },
            error: (err) => {
              console.error('Failed to load detailed order properties:', err);
              this.isLoading.set(false); // We can still show the table even if details fail
            },
          });
      },
      error: (err) => {
        console.error('Failed to load orders:', err);
        this.error.set('Could not load orders for this event.');
        this.isLoading.set(false);
      },
    });
  }

  openDetails(summaryOrder: BookedEventOrderId): void {
    // Find the matching detailed order from the list we fetched
    const fullDetails = this.detailedOrders().find(
      (d) => d.order_id === summaryOrder.order_id,
    );

    if (fullDetails) {
      this.dialog.open(OrderDetailsModal, {
        data: fullDetails,
        width: '800px',
        maxWidth: '95vw',
        autoFocus: 'dialog',
      });
    } else {
      console.error(
        'Could not find detailed properties for order:',
        summaryOrder.order_id,
      );
    }
  }
}
