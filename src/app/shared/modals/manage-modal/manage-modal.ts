import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import {
  EventModel,
  EventTicketTypeModel,
  UpdateEventModel,
  UpdateTicketTypeModel,
  BookedEventOrderId,
  EventBookingProperty,
} from '../../../app-model/model';

import { ExploreService } from '../../../core/services/explore-service/explore-service';
import { OrganizerService } from '../../../core/services/organizer-service/organizer-service';
import { ToastService } from '../../../core/services/toast-service/toast-service';

export interface ManageModalData {
  eventId: string;
  initialView?: 'details' | 'orders' | 'attendees' | 'edit';
}

export type ManageModalResult = 'updated' | undefined;

type ModalView = 'details' | 'orders' | 'attendees' | 'edit';

interface EditableTicket {
  uuid: string;
  sold: number;
  form: FormGroup;
}

@Component({
  selector: 'app-manage-modal',
  imports: [DatePipe, NgClass, ReactiveFormsModule],
  templateUrl: './manage-modal.html',
  styleUrl: './manage-modal.css',
})
export class ManageModal implements OnInit {
  private exploreService = inject(ExploreService);
  private organizerService = inject(OrganizerService);
  private formBuilder = inject(FormBuilder);
  private toastService = inject(ToastService);

  private dialogRef =
    inject<MatDialogRef<ManageModal, ManageModalResult>>(MatDialogRef);

  private data = inject<ManageModalData>(MAT_DIALOG_DATA);

  // Modal navigation
  view = signal<ModalView>(this.data.initialView ?? 'details');
  returnView = signal<'orders' | 'attendees'>('orders');

  hasChanges = false;

  // Event details
  event = signal<EventModel | null>(null);
  isLoading = signal(true);
  loadError = signal('');

  cover = computed(() => this.event()?.image_url ?? '');

  totalSold = computed(() =>
    (this.event()?.ticket_types ?? []).reduce(
      (sum, ticket) => sum + ticket.sold_quantity,
      0,
    ),
  );

  // Orders
  orders = signal<BookedEventOrderId[]>([]);
  ordersLoading = signal(false);
  ordersLoaded = false;
  ordersError = signal('');
  orderSearch = signal('');

  visibleOrders = computed(() => {
    const term = this.orderSearch().trim().toLowerCase();

    return this.orders().filter(
      (order) =>
        !term ||
        order.order_id.toLowerCase().includes(term) ||
        order.buyer.toLowerCase().includes(term) ||
        order.type.toLowerCase().includes(term),
    );
  });

  // Attendees
  bookings = signal<EventBookingProperty[]>([]);
  attendeesLoading = signal(false);
  attendeesLoaded = false;
  attendeesError = signal('');

  selectedOrder = signal<string | null>(null);

  selectedBooking = computed(() => {
    const orderId = this.selectedOrder();

    if (!orderId) {
      return null;
    }

    return (
      this.bookings().find((booking) => booking.order_id === orderId) ?? null
    );
  });

  // Edit event
  isSaving = signal(false);
  isChangingCover = signal(false);
  savingTicketId = signal<string | null>(null);

  editError = signal('');
  coverUrl = signal<string | null>(null);
  tickets = signal<EditableTicket[]>([]);

  editForm = this.formBuilder.group({
    title: ['', Validators.required],
    host_name: ['', Validators.required],
    description: ['', Validators.required],
    location: ['', Validators.required],
    event_date: ['', Validators.required],
    duration: ['', Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  // Load event
  load(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.exploreService.getEvent(this.data.eventId).subscribe({
      next: (event) => {
        this.event.set(event);
        this.initializeEditForm(event);
        this.isLoading.set(false);

        // Load the requested view when the modal opens directly into it.
        if (this.view() === 'orders' && !this.ordersLoaded) {
          this.loadOrders();
        }

        if (this.view() === 'attendees' && !this.attendeesLoaded) {
          this.loadAttendees();
        }
      },

      error: (error) => {
        console.error('Failed to load event details:', error);

        this.loadError.set('We could not load this event. Please try again.');

        this.isLoading.set(false);
      },
    });
  }

  // Navigation
  showView(view: ModalView): void {
    this.view.set(view);
    this.selectedOrder.set(null);

    if (view === 'orders' && !this.ordersLoaded) {
      this.loadOrders();
    }

    if (view === 'attendees' && !this.attendeesLoaded) {
      this.loadAttendees();
    }
  }

  edit(): void {
    this.showView('edit');
  }

  close(): void {
    this.dialogRef.close(this.hasChanges ? 'updated' : undefined);
  }

  // Orders
  loadOrders(): void {
    this.ordersLoading.set(true);
    this.ordersError.set('');

    this.organizerService.getEventOrders(this.data.eventId).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.ordersLoaded = true;
        this.ordersLoading.set(false);
      },

      error: (error) => {
        console.error('Failed to load event orders:', error);

        this.ordersError.set(
          this.errorText(error, 'Could not load orders for this event.'),
        );

        this.ordersLoading.set(false);
      },
    });
  }

  onOrderSearch(value: string): void {
    this.orderSearch.set(value);
  }

  // Attendees
  loadAttendees(): void {
    this.attendeesLoading.set(true);
    this.attendeesError.set('');

    this.organizerService
      .getEventBookingProperties(this.data.eventId)
      .subscribe({
        next: (bookings) => {
          this.bookings.set(bookings);
          this.attendeesLoaded = true;
          this.attendeesLoading.set(false);
        },

        error: (error) => {
          console.error('Failed to load event attendees:', error);

          this.attendeesError.set(
            this.errorText(error, 'Could not load attendees for this event.'),
          );

          this.attendeesLoading.set(false);
        },
      });
  }

  viewBooking(
    orderId: string,
    returnTo: 'orders' | 'attendees' = 'orders',
  ): void {
    this.returnView.set(returnTo);
    this.selectedOrder.set(orderId);
    this.view.set('attendees');

    if (!this.attendeesLoaded) {
      this.loadAttendees();
    }
  }

  backToList(): void {
    this.selectedOrder.set(null);
    this.view.set(this.returnView());
  }

  // Edit event
  private initializeEditForm(event: EventModel): void {
    this.editForm.reset({
      title: event.title,
      host_name: event.host_name,
      description: event.description,
      location: event.location,
      event_date: this.toLocalInput(event.event_date),
      duration: event.duration,
    });

    this.coverUrl.set(event.image_url);

    this.tickets.set(
      event.ticket_types.map((ticket) => this.toEditable(ticket)),
    );
  }

  saveEdit(): void {
    const event = this.event();

    if (!event) {
      return;
    }

    this.editForm.markAllAsTouched();

    if (this.editForm.invalid) {
      this.editError.set('Please fill in every field.');
      return;
    }

    const value = this.editForm.getRawValue();

    const changes: UpdateEventModel = {
      title: value.title!.trim(),
      host_name: value.host_name!.trim(),
      description: value.description!.trim(),
      location: value.location!.trim(),
      event_date: new Date(value.event_date!).toISOString(),
      duration: value.duration!.trim(),
    };

    this.isSaving.set(true);
    this.editError.set('');

    this.organizerService.updateEvent(event.uuid, changes).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.initializeEditForm(updated);
        this.hasChanges = true;

        this.toastService.show(
          `Saved changes to "${updated.title}".`,
          'success',
        );

        this.isSaving.set(false);
        this.showView('details');
      },

      error: (error) => {
        console.error('Save failed:', error);

        this.toastService.show(
          this.errorText(error, 'Could not save your changes.'),
          'error',
          5000,
        );

        this.isSaving.set(false);
      },
    });
  }

  changeCover(input: HTMLInputElement): void {
    const event = this.event();
    const file = input.files?.[0];

    if (!event || !file) {
      return;
    }

    this.isChangingCover.set(true);
    this.editError.set('');

    this.organizerService.updateEventImage(event.uuid, file).subscribe({
      next: (updated) => {
        this.event.update((current) =>
          current ? { ...current, image_url: updated.image_url } : current,
        );

        this.coverUrl.set(updated.image_url ?? null);
        this.hasChanges = true;

        this.toastService.show('Cover image updated.', 'success');

        this.isChangingCover.set(false);
        input.value = '';
      },

      error: (error) => {
        console.error('Cover update failed:', error);

        this.toastService.show(
          this.errorText(error, 'Could not update the cover image.'),
          'error',
          5000,
        );

        this.isChangingCover.set(false);
        input.value = '';
      },
    });
  }

  saveTicket(ticket: EditableTicket): void {
    const event = this.event();

    if (!event) {
      return;
    }

    ticket.form.markAllAsTouched();

    if (ticket.form.invalid) {
      this.editError.set(
        ticket.sold > 0
          ? `Check the ticket details. Total quantity cannot be below the ${ticket.sold} already sold.`
          : 'Check the ticket details.',
      );

      return;
    }

    const value = ticket.form.getRawValue();

    const changes: UpdateTicketTypeModel = {
      name: String(value.name).trim(),
      price: Number(value.price),
      total_quantity: Number(value.total_quantity),
    };

    this.savingTicketId.set(ticket.uuid);
    this.editError.set('');

    this.organizerService
      .updateTicketType(event.uuid, ticket.uuid, changes)
      .subscribe({
        next: (updated) => {
          this.event.set(updated);

          const fresh = updated.ticket_types.find(
            (item) => item.uuid === ticket.uuid,
          );

          if (fresh) {
            this.tickets.update((list) =>
              list.map((item) =>
                item.uuid === fresh.uuid ? this.toEditable(fresh) : item,
              ),
            );
          }

          this.hasChanges = true;

          this.toastService.show(
            `Ticket "${changes.name}" updated.`,
            'success',
          );

          this.savingTicketId.set(null);
        },

        error: (error) => {
          console.error('Ticket update failed:', error);

          this.toastService.show(
            this.errorText(error, 'Could not update this ticket.'),
            'error',
            5000,
          );

          this.savingTicketId.set(null);
        },
      });
  }

  // Validation
  hasFieldError(name: string): boolean {
    const control = this.editForm.get(name);
    return !!(control && control.invalid && control.touched);
  }

  hasTicketError(ticket: EditableTicket, name: string): boolean {
    const control = ticket.form.get(name);
    return !!(control && control.invalid && control.touched);
  }

  // Formatting
  formatPrice(amount: number | string): string {
    const value = Number(amount);

    if (!Number.isFinite(value)) {
      return '—';
    }

    return value === 0 ? 'Free' : `₦${value.toLocaleString('en-NG')}`;
  }

  statusLabel(status: string): string {
    if (!status) {
      return 'Unknown';
    }

    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  statusClasses(status: string): string {
    switch (status.toLowerCase()) {
      case 'published':
        return 'bg-success/10 text-success-dark';

      case 'completed':
        return 'bg-brand-soft text-brand-dark';

      case 'cancelled':
        return 'bg-danger/10 text-danger-dark';

      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  // Helpers
  private toEditable(ticket: EventTicketTypeModel): EditableTicket {
    return {
      uuid: ticket.uuid,
      sold: ticket.sold_quantity,

      form: this.formBuilder.group({
        name: [ticket.name, Validators.required],

        price: [ticket.price, [Validators.required, Validators.min(0)]],

        total_quantity: [
          ticket.total_quantity,
          [
            Validators.required,
            Validators.min(Math.max(ticket.sold_quantity, 1)),
          ],
        ],
      }),
    };
  }

  private errorText(error: unknown, fallback: string): string {
    const e = error as {
      error?: { detail?: unknown; message?: string };
    };

    if (typeof e?.error?.detail === 'string') {
      return e.error.detail;
    }

    return e?.error?.message ?? fallback;
  }

  private toLocalInput(iso: string): string {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
