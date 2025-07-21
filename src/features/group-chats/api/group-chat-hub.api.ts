import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../shared/api-result';
import { GroupChat } from '../../../entities/group-chats';

@Injectable({
  providedIn: 'root'
})
export class GroupChatApiService {
  private connection!: signalR.HubConnection;

  private chatsSubject = new BehaviorSubject<GroupChat[]>([]);
  chats$: Observable<GroupChat[]> = this.chatsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$: Observable<boolean> = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  error$: Observable<string | null> = this.errorSubject.asObservable();

  connect(): void {
    this.connection = new signalR.HubConnectionBuilder()
    .withUrl(environment.groupChatHubUrl, { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    this.connection.onclose(error => {
      this.loadingSubject.next(false);
    });

    this.connection.onreconnected(connectionId => {
      this.errorSubject.next(null);
      this.loadingSubject.next(false);
    });

    this.connection.onreconnecting(error => {
      this.loadingSubject.next(true);
    });

    this.loadingSubject.next(true);

    from(this.connection.start())
      .pipe(
        switchMap(() => from(this.connection.invoke<GroupChat[]>('GetAllGroupForUserAsync'))),
        tap(chats => {
          this.chatsSubject.next(chats ?? []);
          this.errorSubject.next(null);
        }),
        catchError(err => {
          this.errorSubject.next(err.message || 'Error with connection');
          this.chatsSubject.next([]);
          return of([]);
        }),
        tap(() => this.loadingSubject.next(false))
      )
      .subscribe();
  }
}
