import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '../../shared/pipes/date-pipe';
import { UserService } from '../../core/services/user-service/user-service';
import { UserBookedTicketResponse, UserModel } from '../../app-model/model';
import { ProfileModal } from '../../shared/modals/profile-modal/profile-modal';

/** What the template shows for one booking. */
interface BookingView {
  raw: UserBookedTicketResponse;
  title: string;
  location: string;
  date: string;
  image: string | null;
  quantity: number;
  total: number;
  isFree: boolean;
  status: string;
  isPast: boolean;
}

interface StatusOption {
  id: string; // 'all' or a lowercase status
  label: string;
  count: number;
}

@Component({
  selector: 'app-profile',
  imports: [DatePipe, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  location = 'Lagos, Nigeria';

  // =========================
  // State
  // =========================
  user = signal<UserModel | null>(null);
  userError = signal('');

  bookings = signal<UserBookedTicketResponse[]>([]);
  bookingsLoading = signal(true);
  bookingsError = signal('');

  statusFilter = signal('all');

  // One pill per status found in the bookings, each with a count.
  statusOptions = computed<StatusOption[]>(() => {
    const list = this.bookings();
    const counts = new Map<string, number>();
    for (const b of list) {
      const key = (b.status ?? '').toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [
      { id: 'all', label: 'All', count: list.length },
      ...[...counts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([id, count]) => ({ id, label: this.statusLabel(id), count })),
    ];
  });

  // Upcoming events first (soonest on top), then past ones (most recent on top).
  bookingList = computed<BookingView[]>(() => {
    const status = this.statusFilter();
    const views = this.bookings()
      .filter(
        (b) => status === 'all' || (b.status ?? '').toLowerCase() === status,
      )
      .map((b) => this.toView(b));
    const time = (v: BookingView) => new Date(v.date).getTime() || 0;

    const upcoming = views
      .filter((v) => !v.isPast)
      .sort((a, b) => time(a) - time(b));
    const past = views
      .filter((v) => v.isPast)
      .sort((a, b) => time(b) - time(a));

    return [...upcoming, ...past];
  });

  // =========================
  // Lifecycle
  // =========================
  ngOnInit(): void {
    this.userDetails();
    this.loadBookings();
  }

  // =========================
  // User
  // =========================
  userDetails(): void {
    this.userError.set('');

    this.userService.getUser().subscribe({
      next: (user) => this.user.set(user),
      error: (error) => {
        console.error('Error fetching user details:', error);
        this.userError.set('We could not load your details.');
      },
    });
  }

  fullName(): string {
    const u = this.user();
    return u ? `${u.first_name} ${u.last_name}`.trim() : '';
  }

  createInitials(): string {
    const u = this.user();
    if (!u) return '';
    return `${u.first_name?.charAt(0) ?? ''}${u.last_name?.charAt(0) ?? ''}`.toUpperCase();
  }

  openEditProfile(): void {
    const currentUser = this.user();
    if (!currentUser) return;

    this.dialog
      .open(ProfileModal, {
        data: currentUser,
        width: '480px',
        maxWidth: '94vw',
        autoFocus: 'dialog',
      })
      .afterClosed()
      .subscribe((refresh) => {
        if (refresh) this.userDetails(); // Refresh if saved
      });
  }

  // =========================
  // Bookings
  // =========================
  loadBookings(): void {
    this.bookingsLoading.set(true);
    this.bookingsError.set('');

    this.userService.getBookedTickets().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.bookingsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load bookings:', error);
        this.bookingsError.set('We could not load your bookings.');
        this.bookingsLoading.set(false);
      },
    });
  }

  setStatus(id: string): void {
    this.statusFilter.set(id);
  }

  goToBooking(booking: UserBookedTicketResponse): void {
    this.router.navigate(['/booking-details', booking.uuid]);
  }

  private toView(b: UserBookedTicketResponse): BookingView {
    const date = b.event?.event_date ?? '';
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return {
      raw: b,
      title: b.event?.title ?? 'Event',
      location: b.event?.location ?? '',
      date,
      image: b.event?.images ?? null,
      quantity: b.quantity,
      total: b.total_amount,
      isFree: b.is_free,
      status: b.status ?? '',
      isPast: !!date && new Date(date) < startOfToday,
    };
  }

  // =========================
  // Display helpers
  // =========================
  formatAmount(total: number): string {
    return total === 0 ? 'Free' : `₦${total.toLocaleString('en-NG')}`;
  }

  month(iso: string): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-NG', { month: 'short' })
      : '';
  }

  day(iso: string): string {
    return iso ? String(new Date(iso).getDate()) : '';
  }

  statusLabel(status: string): string {
    const s = status.replace(/_/g, ' ').toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  statusClasses(status: string): string {
    const s = status.toLowerCase();
    if (['paid', 'completed', 'confirmed', 'success', 'checked_in'].includes(s))
      return 'bg-success/10 text-success-dark';
    if (['pending', 'processing', 'reserved'].includes(s))
      return 'bg-accent/30 text-accent-dark';
    if (['cancelled', 'canceled', 'expired', 'failed', 'refunded'].includes(s))
      return 'bg-danger/10 text-danger-dark';
    return 'bg-ink/10 text-ink/70';
  }
}
