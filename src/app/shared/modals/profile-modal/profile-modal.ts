import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { UserService } from '../../../core/services/user-service/user-service';
import { ToastService } from '../../../core/services/toast-service/toast-service';
import { UserModel } from '../../../app-model/model';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './profile-modal.html',
  styleUrl: './profile-modal.css',
})
export class ProfileModal {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  public dialogRef = inject(MatDialogRef<ProfileModal>);
  public data = inject<UserModel>(MAT_DIALOG_DATA);

  isSaving = false;

  profileForm = this.fb.group({
    first_name: [this.data.first_name, Validators.required],
    last_name: [this.data.last_name, Validators.required],
    phone: [this.data.phone, Validators.required],
    current_password: [''],
    new_password: [''],
  });

  saveProfile(): void {
    if (this.profileForm.invalid) return;

    this.isSaving = true;
    const val = this.profileForm.getRawValue();

    // 1. Update basic info
    this.userService
      .updateUserProfile({
        first_name: val.first_name!,
        last_name: val.last_name!,
        phone: val.phone!,
      })
      .subscribe({
        next: () => {
          // 2. Update password if provided
          if (val.current_password && val.new_password) {
            this.userService
              .updatePassword({
                current_password: val.current_password,
                new_password: val.new_password,
              })
              .subscribe({
                next: () => this.finish(),
                error: (err) =>
                  this.handleError(
                    err,
                    'Profile updated, but password failed.',
                  ),
              });
          } else {
            this.finish();
          }
        },
        error: (err) => this.handleError(err, 'Could not update profile.'),
      });
  }

  private finish(): void {
    this.isSaving = false;
    this.toastService.show('Profile updated successfully.', 'success', 3000);
    this.dialogRef.close(true); // Return true to signal a refresh is needed
  }

  private handleError(err: any, msg: string): void {
    this.isSaving = false;
    this.toastService.show(err?.error?.detail || msg, 'error', 5000);
  }
}
