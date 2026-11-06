import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  UserModel,
  UserBookedTicketResponse,
  UserOrderIdBookedTicket,
  UserBookedTicketAttendees,
  UpdateUserModel,
  UpdatePasswordRequest,
  UpdateBankDetailsRequest,
  UpdateBankDetailsResponse,
} from '../../../app-model/model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = environment.BASE_URL;

  constructor(private http: HttpClient) {}

  getUser(): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.baseUrl}/auth/me`);
  }

  updateUserProfile(data: UpdateUserModel): Observable<UserModel> {
    return this.http.patch<UserModel>(`${this.baseUrl}/auth/me`, data);
  }

  updatePassword(data: UpdatePasswordRequest): Observable<any> {
    return this.http.patch(`${this.baseUrl}/auth/me/password`, data);
  }

  updateBankDetails(
    data: UpdateBankDetailsRequest,
  ): Observable<UpdateBankDetailsResponse> {
    return this.http.patch<UpdateBankDetailsResponse>(
      `${this.baseUrl}/auth/me/bank-details`,
      data,
    );
  }

  getBookedTickets(): Observable<UserBookedTicketResponse[]> {
    return this.http.get<UserBookedTicketResponse[]>(
      `${this.baseUrl}/bookings/me`,
    );
  }

  getUserBookedOrder(orderId: string): Observable<UserOrderIdBookedTicket[]> {
    return this.http.get<UserOrderIdBookedTicket[]>(
      `${this.baseUrl}/bookings/${orderId}`,
    );
  }

  getUserBookedAttendees(
    orderId: string,
  ): Observable<UserBookedTicketAttendees[]> {
    return this.http.get<UserBookedTicketAttendees[]>(
      `${this.baseUrl}/bookings/${orderId}/attendees`,
    );
  }
}
