import { Component, inject, signal } from '@angular/core';
import { NgClass, DatePipe, TitleCasePipe } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  EventBookingProperty,
  EventOrderIdAttendees,
} from '../../../app-model/model';
import { OrganizerService } from '../../../core/services/organizer-service/organizer-service';
import { ToastService } from '../../../core/services/toast-service/toast-service';

@Component({
  selector: 'app-order-details-modal',
  standalone: true,
  imports: [MatDialogModule, DatePipe, NgClass, TitleCasePipe],
  templateUrl: './order-details-modal.html',
})
export class OrderDetailsModal {
  private organizerService = inject(OrganizerService);
  private toastService = inject(ToastService);
  public dialogRef = inject(MatDialogRef<OrderDetailsModal>);
  public order = inject<EventBookingProperty>(MAT_DIALOG_DATA);

  isCheckingIn = signal(false);
  localOrder = signal<EventBookingProperty>(this.order);

  checkIn(): void {
    if (this.localOrder().checked_in) return;

    this.isCheckingIn.set(true);
    this.organizerService
      .checkInEvent(this.localOrder().order_id, {
        order_id: this.localOrder().order_id,
      })
      .subscribe({
        next: (res) => {
          this.isCheckingIn.set(false);
          this.localOrder.update((o) => ({
            ...o,
            checked_in: true,
            checked_in_at: res.checked_in_at,
          }));
          this.toastService.show(
            'Order checked in successfully.',
            'success',
            3000,
          );
        },
        error: (err) => {
          this.isCheckingIn.set(false);
          this.toastService.show(
            err?.error?.detail || 'Could not check in.',
            'error',
            4000,
          );
        },
      });
  }
}
