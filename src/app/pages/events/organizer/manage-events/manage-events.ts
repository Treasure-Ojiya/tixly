import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { filter } from 'rxjs';

import { EventListItem } from '../../../../app-model/model';
import { OrganizerService } from '../../../../core/services/organizer-service/organizer-service';
import { ToastService } from '../../../../core/services/toast-service/toast-service';

import {
  ConfirmModal,
  ConfirmModalData,
} from '../../../../shared/modals/confirm-modal/confirm-modal';

import {
  ManageModal,
  ManageModalData,
  ManageModalResult,
} from '../../../../shared/modals/manage-modal/manage-modal';

type StatusFilter = '' | 'draft' | 'published' | 'completed' | 'cancelled';

// One ticket type inside the edit panel, with its own small form.


@Component({
  selector: 'app-manage-events',
  imports: [RouterLink, DatePipe, NgClass, ],
  templateUrl: './manage-events.html',
  styleUrl: './manage-events.css',
})
export class ManageEvents {
  private organizerService = inject(OrganizerService);
  private dialog = inject(MatDialog);
  private toastService = inject(ToastService);

  // =========================
  // List state
  // =========================

  events = signal<EventListItem[]>([]);
  isLoading = signal(true);
  loadError = signal('');
  // GET /events/me returns every event the user owns and takes no
  // parameters, so search and the status chips filter the list here.
  query = signal('');
  statusFilter = signal<StatusFilter>('');

  publishingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  readonly statusOptions: { id: StatusFilter; label: string }[] = [
    { id: '', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'published', label: 'Published' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  hasFilters = computed(() => !!this.query().trim() || !!this.statusFilter());

  // Search and status chip applied here, newest event first.
  visibleEvents = computed(() => {
    const status = this.statusFilter();
    const term = this.query().trim().toLowerCase();

    return this.events()
      .filter((e) => !status || e.status.toLowerCase() === status)
      .filter(
        (e) =>
          !term ||
          e.title.toLowerCase().includes(term) ||
          e.location.toLowerCase().includes(term),
      )
      .sort((a, b) => b.event_date.localeCompare(a.event_date));
  });

  // =========================
  // Edit panel state
  // =========================




  // =========================
  // Lifecycle
  // =========================

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.organizerService.getMyEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load events:', error);
        this.loadError.set('We could not load your events. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  retry(): void {
    this.load();
  }

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }



openView(event: EventListItem): void {
  this.openManageModal(event, 'details');
}

openEdit(event: EventListItem): void {
  this.openManageModal(event, 'edit');
}

private openManageModal(
  event: EventListItem,
  initialView: ManageModalData['initialView'],
): void {
  this.dialog
    .open<ManageModal, ManageModalData, ManageModalResult>(ManageModal, {
      data: {
        eventId: event.uuid,
        initialView,
      },
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: 'dialog',
    })
    .afterClosed()
    .subscribe((result) => {
      if (result === 'updated') {
        this.load();
      }
    });
}

  askPublish(event: EventListItem): void {
    this.confirm({
      title: 'Publish this event?',
      message: `"${event.title}" will become visible to everyone and open for booking.`,
      confirmLabel: 'Yes, publish',
    }).subscribe(() => this.publish(event));
  }

  private publish(event: EventListItem): void {
    this.publishingId.set(event.uuid);

    this.organizerService.publishEvent(event.uuid).subscribe({
      next: (updated) => {
        this.events.update((list) =>
          list.map((e) =>
            e.uuid === updated.uuid ? { ...e, status: updated.status } : e,
          ),
        );
        this.toastService.show(`"${updated.title}" is now live.`, 'success');
        this.publishingId.set(null);
      },
      error: (error) => {
        console.error('Publish failed:', error);
        this.toastService.show(
          this.errorText(error, 'Could not publish this event.'),
          'error',
          5000,
        );
        this.publishingId.set(null);
      },
    });
  }

  askDelete(event: EventListItem): void {
    const sold =
      event.tickets_sold > 0
        ? ` ${event.tickets_sold} ${event.tickets_sold === 1 ? 'ticket has' : 'tickets have'} already been sold.`
        : '';

    this.confirm({
      title: 'Delete this event?',
      message: `"${event.title}" will be removed permanently.${sold} This cannot be undone.`,
      confirmLabel: 'Yes, delete',
      tone: 'danger',
    }).subscribe(() => this.delete(event));
  }

  private delete(event: EventListItem): void {
    this.deletingId.set(event.uuid);

    this.organizerService.deleteEvent(event.uuid).subscribe({
      next: () => {
        this.events.update((list) => list.filter((e) => e.uuid !== event.uuid));
        this.toastService.show(`"${event.title}" was deleted.`, 'success');
        this.deletingId.set(null);
      },
      error: (error) => {
        console.error('Delete failed:', error);
        this.toastService.show(
          this.errorText(error, 'Could not delete this event.'),
          'error',
          5000,
        );
        this.deletingId.set(null);
      },
    });
  }













  statusLabel(status: string): string {
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



  private errorText(error: unknown, fallback: string): string {
    const e = error as { error?: { detail?: unknown; message?: string } };

    if (typeof e?.error?.detail === 'string') {
      return e.error.detail;
    }

    return e?.error?.message ?? fallback;
  }


}
