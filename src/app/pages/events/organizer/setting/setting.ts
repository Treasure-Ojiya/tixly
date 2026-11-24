import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { UpdateUserModel, UserModel } from '../../../../app-model/model';
import { OrganizerService } from '../../../../core/services/organizer-service/organizer-service';
import { ToastService } from '../../../../core/services/toast-service/toast-service';

/** Both password fields must match. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('new_password')?.value;
  const confirm = group.get('confirm_password')?.value;
  return next && confirm && next !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './setting.html',
})
export class Setting implements OnInit {
  private readonly organizerService = inject(OrganizerService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  // ─── Loaded profile ───
  readonly profile = signal<UserModel | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal('');

  // ─── Profile form ───
  readonly profileForm = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    phone: [
      '',
      [Validators.required, Validators.pattern(/^\+?[0-9\s()-]{7,20}$/)],
    ],
    organization: [''],
  });
  readonly isSavingProfile = signal(false);

  // ─── Password form ───
  readonly passwordForm = this.fb.nonNullable.group(
    {
      current_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  readonly isSavingPassword = signal(false);

  // ─── Bank form ───
  readonly bankForm = this.fb.nonNullable.group({
    bank_name: ['', Validators.required],
    bank_account_number: [
      '',
      [Validators.required, Validators.pattern(/^\d{10}$/)],
    ],
  });
  readonly isSavingBank = signal(false);

  ngOnInit(): void {
    this.loadProfile();
  }

  // Organization accounts have an organization name; individuals don't.
  isOrganization(): boolean {
    return this.profile()?.account_type?.toLowerCase() === 'organization';
  }

  accountTypeLabel(): string {
    return this.isOrganization() ? 'Organization' : 'Individual';
  }

  // ─────────────── Load ───────────────

  loadProfile(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.organizerService.getMyProfile().subscribe({
      next: (user) => {
        this.profile.set(user);
        this.fillForms(user);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load profile:', error);
        this.loadError.set('Your settings could not be loaded.');
        this.isLoading.set(false);
      },
    });
  }

  private fillForms(user: UserModel): void {
    this.profileForm.reset({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone ?? '',
      organization: user.organization ?? '',
    });

    // Organization accounts must keep an organization name
    const org = this.profileForm.controls.organization;
    org.setValidators(this.isOrganization() ? Validators.required : null);
    org.updateValueAndValidity();

    this.bankForm.reset({
      bank_name: user.bank_name ?? '',
      bank_account_number: user.bank_account_number ?? '',
    });
  }

  // ─────────────── Profile ───────────────

  saveProfile(): void {
    const current = this.profile();
    if (!current || this.isSavingProfile()) return;

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const v = this.profileForm.getRawValue();

    // Only send what actually changed
    const changes: UpdateUserModel = {};
    if (v.first_name.trim() !== current.first_name)
      changes.first_name = v.first_name.trim();
    if (v.last_name.trim() !== current.last_name)
      changes.last_name = v.last_name.trim();
    if (v.phone.trim() !== (current.phone ?? ''))
      changes.phone = v.phone.trim();
    if (
      this.isOrganization() &&
      v.organization.trim() !== (current.organization ?? '')
    ) {
      changes.organization = v.organization.trim();
    }

    if (Object.keys(changes).length === 0) {
      this.profileForm.markAsPristine();
      return;
    }

    this.isSavingProfile.set(true);

    this.organizerService.updateMyProfile(changes).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.profileForm.markAsPristine();
        this.isSavingProfile.set(false);
        this.toastService.show('Profile updated.', 'success');
      },
      error: (error) => {
        console.error('Failed to update profile:', error);
        this.isSavingProfile.set(false);
        this.toastService.show(
          this.errorText(error, 'Your profile could not be updated.'),
          'error',
          5000,
        );
      },
    });
  }

  // ─────────────── Password ───────────────

  changePassword(): void {
    if (this.isSavingPassword()) return;

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const v = this.passwordForm.getRawValue();

    this.isSavingPassword.set(true);

    this.organizerService
      .updatePassword({
        current_password: v.current_password,
        new_password: v.new_password,
      })
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.isSavingPassword.set(false);
          this.toastService.show('Password updated.', 'success');
        },
        error: (error) => {
          console.error('Failed to update password:', error);
          this.isSavingPassword.set(false);
          this.toastService.show(
            this.errorText(error, 'Your password could not be updated.'),
            'error',
            5000,
          );
        },
      });
  }

  // ─────────────── Bank details ───────────────

  saveBank(): void {
    if (this.isSavingBank()) return;

    if (this.bankForm.invalid) {
      this.bankForm.markAllAsTouched();
      return;
    }

    const v = this.bankForm.getRawValue();

    this.isSavingBank.set(true);

    this.organizerService
      .updateBankDetails({
        bank_name: v.bank_name.trim(),
        bank_account_number: v.bank_account_number.trim(),
      })
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.bankForm.markAsPristine();
          this.isSavingBank.set(false);
          this.toastService.show('Bank details saved.', 'success');
        },
        error: (error) => {
          console.error('Failed to save bank details:', error);
          this.isSavingBank.set(false);
          this.toastService.show(
            this.errorText(error, 'Your bank details could not be saved.'),
            'error',
            5000,
          );
        },
      });
  }

  // ─────────────── Helpers ───────────────

  isInvalid(form: 'profile' | 'password' | 'bank', name: string): boolean {
    const control =
      form === 'profile'
        ? this.profileForm.get(name)
        : form === 'password'
          ? this.passwordForm.get(name)
          : this.bankForm.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private errorText(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = (error.error as { detail?: unknown } | null)?.detail;

      if (typeof detail === 'string') return detail;

      if (Array.isArray(detail) && detail.length > 0) {
        return detail
          .map(
            (d: { loc?: string[]; msg?: string }) =>
              `${(d.loc ?? []).slice(1).join('.') || 'field'}: ${d.msg}`,
          )
          .join(' | ');
      }
    }
    return fallback;
  }
}
