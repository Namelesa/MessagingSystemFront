import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';

export abstract class BaseChatApiService<TChat> {
  protected connection!: signalR.HubConnection;

  protected chatsSubject = new BehaviorSubject<TChat[]>([]);
  public chats$: Observable<TChat[]> = this.chatsSubject.asObservable();

  protected loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  protected errorSubject = new BehaviorSubject<string | null>(null);
  public error$: Observable<string | null> = this.errorSubject.asObservable();

  protected messagesSubject = new BehaviorSubject<any[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private currentChatNickName: string | null = null;

  constructor(
    private hubUrl: string,
    private methodName: string,
    private loadHistoryMethod: string
  ) {}

  connect(): void {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    this.connection.onclose(() => {
      this.loadingSubject.next(false);
    });

    this.connection.onreconnected(() => {
      this.errorSubject.next(null);
      this.loadingSubject.next(false);
    });

    this.connection.onreconnecting(() => {
      this.loadingSubject.next(true);
    });

    this.connection.on('ReceivePrivateMessage', (message) => {
      const exists = this.messagesSubject.value.some(m => m.messageId === message.messageId);
      if (!exists) {
        this.messagesSubject.next([...this.messagesSubject.value, message]);
      }
    });

    this.connection.on('UpdateChats', (chats) => {
      this.chatsSubject.next(chats ?? []);
    });

    this.loadingSubject.next(true);

    from(this.connection.start())
      .pipe(
        switchMap(() => from(this.connection.invoke<TChat[]>(this.methodName))),
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

  public loadChatHistory(withUser: string, take: number, skip: number): Observable<any[]> {
    this.currentChatNickName = withUser;
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.log('SignalR not connected');
      return of([]);
    }
    return from(
      this.connection.invoke<any[]>(this.loadHistoryMethod, withUser, take, skip)
    ).pipe(
      tap(messages => {
        console.log('Loaded chat history:', messages);
        this.messagesSubject.next(messages ?? []);
      }),
      catchError(err => {
        console.error('Error loading chat history:', err);
        return of([]);
      })
    );
  }

  protected getCurrentUser(): string | null {
    return localStorage.getItem('nickName');
  }
}
