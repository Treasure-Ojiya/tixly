import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { filter } from 'rxjs';

// TODO: adjust these import paths to where this component lives
import {
  UserBookedTicketAttendees,
  UserOrderIdBookedTicket,
} from '../../app-model/model';
import { BookingService } from '../../core/services/booking-service/booking-service';
import { UserService } from '../../core/services/user-service/user-service';
import { ToastService } from '../../core/services/toast-service/toast-service';
import {
  ConfirmModal,
  ConfirmModalData,
} from '../../shared/modals/confirm-modal/confirm-modal';

const PENDING = ['pending', 'processing', 'reserved'];
const PAID = ['paid', 'completed', 'confirmed', 'success', 'checked_in'];

@Component({
  selector: 'app-booking-details',
  imports: [DatePipe, RouterLink],
  templateUrl: './booking-details.html',
  styleUrl: './booking-details.css',
})
export class BookingDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private bookingService = inject(BookingService); // pay and cancel
  private userService = inject(UserService); // read the booking and its attendees
  private toastService = inject(ToastService);

  private orderId = '';

  // ─── Booking ───
  booking = signal<UserOrderIdBookedTicket | null>(null);
  isLoading = signal(true);
  loadError = signal('');

  // ─── Attendees ───
  attendees = signal<UserBookedTicketAttendees[]>([]);
  attendeesLoading = signal(true);
  attendeesError = signal('');

  // ─── Actions ───
  isPaying = signal(false);
  isCancelling = signal(false);
  copied = signal(false);

  // ─── Derived ───
  isPending = computed(() =>
    PENDING.includes((this.booking()?.status ?? '').toLowerCase()),
  );
  isPaid = computed(() =>
    PAID.includes((this.booking()?.status ?? '').toLowerCase()),
  );
  isPast = computed(() => {
    const date = this.booking()?.event?.event_date;
    if (!date) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(date) < startOfToday;
  });

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.orderId =
      params.get('uuid') ?? params.get('id') ?? params.get('orderId') ?? '';

    if (!this.orderId) {
      this.loadError.set('This booking link is incomplete.');
      this.isLoading.set(false);
      this.attendeesLoading.set(false);
      return;
    }

    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.userService.getUserBookedOrder(this.orderId).subscribe({
      next: (booking) => {
        this.booking.set(booking);
        this.isLoading.set(false);
        this.loadAttendees();
      },
      error: (error) => {
        console.error('Failed to load booking:', error);
        this.loadError.set(
          error?.status === 404
            ? 'We could not find this booking.'
            : 'We could not load this booking. Please try again.',
        );
        this.isLoading.set(false);
        this.attendeesLoading.set(false);
      },
    });
  }

  loadAttendees(): void {
    this.attendeesLoading.set(true);
    this.attendeesError.set('');

    this.userService.getUserBookedAttendees(this.orderId).subscribe({
      next: (list) => {
        this.attendees.set(
          [...list].sort((a, b) => a.ticket_index - b.ticket_index),
        );
        this.attendeesLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load attendees:', error);
        this.attendeesError.set('We could not load the ticket holders.');
        this.attendeesLoading.set(false);
      },
    });
  }

  // ─── Pay for a pending booking ───
  // The order and its ticket holders already exist, so there is no form to
  // fill in again: start Paystack for this order and send the browser there.
  payNow(): void {
    if (this.isPaying()) return;
    this.isPaying.set(true);

    this.bookingService.initPaystack(this.orderId).subscribe({
      next: (res) => {
        if (res.authorization_url?.startsWith('https://')) {
          // Leave isPaying() locked while the browser goes to Paystack.
          window.location.href = res.authorization_url;
          return;
        }
        this.isPaying.set(false);
        this.toastService.show(
          'We could not start your payment. Please try again.',
          'error',
          5000,
        );
      },
      error: (error) => {
        console.error('Payment start failed:', error);
        this.isPaying.set(false);
        this.toastService.show(
          typeof error?.error?.detail === 'string'
            ? error.error.detail
            : 'We could not start your payment. Please try again.',
          'error',
          5000,
        );
      },
    });
  }

  // ─── Cancel a pending booking ───
  askCancel(): void {
    this.confirm({
      title: 'Cancel this booking?',
      message: 'Your reserved tickets will be released. This cannot be undone.',
      confirmLabel: 'Yes, cancel booking',
      tone: 'danger',
    }).subscribe(() => this.cancel());
  }

  private cancel(): void {
    this.isCancelling.set(true);

    this.bookingService.cancelBooking(this.orderId).subscribe({
      next: (res) => {
        this.booking.update((b) => (b ? { ...b, status: res.status } : b));
        this.isCancelling.set(false);
        this.toastService.show('Your booking was cancelled.', 'success');
      },
      error: (error) => {
        console.error('Cancel failed:', error);
        this.isCancelling.set(false);
        this.toastService.show(
          typeof error?.error?.detail === 'string'
            ? error.error.detail
            : 'We could not cancel this booking.',
          'error',
          5000,
        );
      },
    });
  }

  private confirm(data: ConfirmModalData) {
    return this.dialog
      .open<ConfirmModal, ConfirmModalData, boolean>(ConfirmModal, {
        data,
        width: '420px',
        maxWidth: '92vw',
        autoFocus: 'dialog',
      })
      .afterClosed()
      .pipe(filter((confirmed) => confirmed === true));
  }

  // ─── Booking reference ───
  copyReference(): void {
    navigator.clipboard
      ?.writeText(this.orderId)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      })
      .catch(() => {
        /* clipboard unavailable: the reference is still visible */
      });
  }

  // ─── Display helpers ───
  formatAmount(total: number): string {
    return total === 0 ? 'Free' : `₦${total.toLocaleString('en-NG')}`;
  }

  statusLabel(status: string): string {
    const s = status.replace(/_/g, ' ').toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  statusClasses(status: string): string {
    const s = status.toLowerCase();
    if (PAID.includes(s)) return 'bg-success/10 text-success-dark';
    if (PENDING.includes(s)) return 'bg-accent/30 text-accent-dark';
    if (['cancelled', 'canceled', 'expired', 'failed', 'refunded'].includes(s))
      return 'bg-danger/10 text-danger-dark';
    return 'bg-ink/10 text-ink/70';
  }
}
