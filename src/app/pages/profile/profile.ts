import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '../../shared/pipes/date-pipe';
import { UserService } from '../../core/services/user-service/user-service';
import { CartService } from '../../core/services/cart-service/cart-service';
import {
  CartItem,
  UserBookedTicketResponse,
  UserModel,
} from '../../app-model/model';
import { ProfileModal } from '../../shared/modals/profile-modal/profile-modal';

type ProfileTab = 'overview' | 'queue' | 'bookings' | 'following';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, NgClass, NgTemplateOutlet, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private userService = inject(UserService);
  private cartService = inject(CartService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  createdAt = '';
  location = 'Lagos, Nigeria';

  // =========================
  // Tabs
  // =========================
  activeTab: ProfileTab = 'overview';

  tabs: { id: ProfileTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'queue', label: 'Queue' },
    { id: 'bookings', label: 'Bookings' },
  ];

  get activeTabLabel(): string {
    return this.tabs.find((tab) => tab.id === this.activeTab)?.label ?? '';
  }

  // =========================
  // Placeholder stats (still fine)
  // =========================
  stats = [
    { value: 12, label: 'Events attended' },
    { value: 8, label: 'Saved' },
    { value: 14, label: 'Following' },
  ];

  user = signal<UserModel | null>(null);
  queue = signal<CartItem[]>([]);
  bookings = signal<UserBookedTicketResponse[]>([]);
  queueLoading = signal(true);
  queueError = signal('');
  bookingsLoading = signal(true);
  bookingsError = signal('');

  // First few upcoming cart items for the Overview tab.
  upcomingQueue = computed(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return this.queue()
      .filter((i) => new Date(i.event.event_date) >= startOfToday)
      .sort((a, b) => a.event.event_date.localeCompare(b.event.event_date))
      .slice(0, 4);
  });

  // Every cart item, soonest first, for the Queue tab.
  allQueue = computed(() =>
    [...this.queue()].sort((a, b) =>
      a.event.event_date.localeCompare(b.event.event_date),
    ),
  );

  // =========================
  // Lifecycle
  // =========================
  ngOnInit(): void {
    this.userDetails();
    this.loadQueue();
    this.loadBookings();
  }

  loadQueue(): void {
    this.queueLoading.set(true);
    this.queueError.set('');

    this.cartService.getCart().subscribe({
      next: (items) => {
        this.queue.set(items);
        this.queueLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load queue:', error);
        this.queueError.set('We could not load your queue.');
        this.queueLoading.set(false);
      },
    });
  }

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

  // =========================
  // Row helpers
  // =========================
  formatAmount(item: CartItem): string {
    const total = item.ticket_type.price * item.quantity;
    return total === 0 ? 'Free' : `₦${total.toLocaleString('en-NG')}`;
  }

  month(iso: string): string {
    return new Date(iso).toLocaleDateString('en-NG', { month: 'short' });
  }

  day(iso: string): string {
    return String(new Date(iso).getDate());
  }

  // How many attendee forms are still empty on this cart item.
  formsNeeded(item: CartItem): number {
    return item.forms_needed;
  }

  // Scrolls into the queue page at this item, or navigates there.
  goToQueueItem(item: CartItem): void {
    this.router.navigate(['/queue'], {
      fragment: `item-${item.uuid}`,
    });
  }

  // =========================
  // User
  // =========================
  userDetails(): void {
    this.userService.getUser().subscribe({
      next: (user) => {
        this.user.set(user); // This was missing

        this.firstName = user.first_name;
        this.lastName = user.last_name;
        this.email = user.email;
        this.phone = user.phone;
        this.createdAt = user.created_at;
      },
      error: (error) => console.error('Error fetching user details:', error),
    });
  }

  createInitials(): string {
    const first = this.firstName ? this.firstName.charAt(0).toUpperCase() : '';
    const last = this.lastName ? this.lastName.charAt(0).toUpperCase() : '';
    return first + last;
  }

  openEditProfile() {
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

  goToBooking(booking: UserBookedTicketResponse) {
    this.router.navigate(['/profile/bookings', booking.uuid]);
  }
}
