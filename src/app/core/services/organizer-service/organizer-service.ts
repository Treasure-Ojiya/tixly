import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import {
  CreateEventModel,
  EventModel,
  EventCategories,
  CreateCategory,
  EventListItem,
  UpdateEventModel,
  UpdateTicketTypeModel,
  BookedEventOrderId,
  EventBookingProperty,
  EventCheckInRequest,
  EventCheckInResponse,
  UpdateToFeaturedRequest,
  PayForFeatured,
} from '../../../app-model/model';

@Injectable({
  providedIn: 'root',
})
export class OrganizerService {
  private baseUrl = environment.BASE_URL;

  constructor(private http: HttpClient) {}

  createEvent(
    eventData: CreateEventModel,
    image: File,
  ): Observable<EventModel> {
    const formData = new FormData();

    formData.append('data', JSON.stringify(eventData));
    formData.append('image', image);

    return this.http.post<EventModel>(`${this.baseUrl}/events/`, formData);
  }

  getMyEvents(): Observable<EventListItem[]> {
    return this.http.get<EventListItem[]>(`${this.baseUrl}/events/me`);
  }

  updateEvent(
    eventId: string,
    changes: UpdateEventModel,
  ): Observable<EventModel> {
    return this.http.patch<EventModel>(
      `${this.baseUrl}/events/${eventId}`,
      changes,
    );
  }

  deleteEvent(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${eventId}`);
  }

  updateEventImage(eventId: string, image: File): Observable<EventModel> {
    const formData = new FormData();
    formData.append('image', image);

    return this.http.patch<EventModel>(
      `${this.baseUrl}/events/${eventId}/image`,
      formData,
    );
  }

  updateTicketType(
    eventId: string,
    ticketTypeId: string,
    changes: UpdateTicketTypeModel,
  ): Observable<EventModel> {
    return this.http.patch<EventModel>(
      `${this.baseUrl}/events/${eventId}/ticket-types/${ticketTypeId}`,
      changes,
    );
  }

  featureEvent(
    eventId: string,
    request: UpdateToFeaturedRequest,
  ): Observable<EventModel> {
    return this.http.patch<EventModel>(
      `${this.baseUrl}/events/${eventId}/feature`,
      request,
    );
  }

  payForEvent(eventId: string, paymentData: PayForFeatured): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/events/${eventId}/feature/pay`,
      paymentData,
    );
  }
  ////////////////////////////////////////manage events

  // POST /events/{event_id}/publish: publish a draft event public.
  publishEvent(eventId: string): Observable<EventModel> {
    return this.http.post<EventModel>(
      `${this.baseUrl}/events/${eventId}/publish`,
      {},
    );
  }

  getEventCategory(): Observable<EventCategories[]> {
    return this.http.get<EventCategories[]>(`${this.baseUrl}/categories/`);
  }

  newEventCategory(newCategory: CreateCategory): Observable<EventCategories> {
    return this.http.post<EventCategories>(
      `${this.baseUrl}/categories/`,
      newCategory,
    );
  }

  // 1. Fetch the list for the table
  getEventOrders(event_id: string): Observable<BookedEventOrderId[]> {
    return this.http.get<BookedEventOrderId[]>(
      `${this.baseUrl}/events/${event_id}/orders`,
    );
  }

  // 2. Fetch the rich details for the modal
  getEventBookingProperties(
    event_Id: string,
  ): Observable<EventBookingProperty[]> {
    return this.http.get<EventBookingProperty[]>(
      `${this.baseUrl}/events/${event_Id}/attendees`,
    );
  }

  checkInEvent(
    event_Id: string,
    checkInRequest: EventCheckInRequest,
  ): Observable<EventCheckInResponse> {
    return this.http.post<EventCheckInResponse>(
      `${this.baseUrl}/events/${event_Id}/checkin`,
      checkInRequest,
    );
  }
}
