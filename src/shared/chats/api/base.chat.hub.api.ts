import { BehaviorSubject, Observable, from, of, Subject } from 'rxjs';
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
  
  protected userInfoUpdatedSubject = new Subject<{ userName: string, image?: string, updatedAt: string, oldNickName: string }>();
  public userInfoUpdated$: Observable<{ userName: string, image?: string, updatedAt: string, oldNickName: string } | null> = this.userInfoUpdatedSubject.asObservable();
  
  private currentChatNickName: string | null = null;

  constructor(
    private hubUrl: string,
    private methodName: string,
    private loadHistoryMethod: string
  ) {}

  connect(): void {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.connection && this.connection.state === signalR.HubConnectionState.Connecting) {
      return;
    }

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
      this.refreshChats();
    });

    this.connection.onreconnecting(() => {
      this.loadingSubject.next(true);
    });

    this.connection.on('ReceivePrivateMessage', (message) => {
      const exists = this.messagesSubject.value.some(m => m.messageId === message.messageId);
      if (!exists) {
        this.messagesSubject.next([...this.messagesSubject.value, message]);
      }
      this.refreshChats();
    });

    this.connection.on('MessageEdited', (editedData) => {
      const currentMessages = this.messagesSubject.value;
      const updatedMessages = currentMessages.map(msg => 
        msg.messageId === editedData.messageId 
          ? { 
              ...msg, 
              content: editedData.newContent,
              isEdited: true,
              editedAt: editedData.editedAt
            } 
          : msg
      );
      this.messagesSubject.next(updatedMessages);
      this.refreshChats();
    });

    this.connection.on('MessageDeleted', (deletedData) => {
      const messageId = typeof deletedData === 'string' ? deletedData : deletedData.messageId;
      const deleteType = typeof deletedData === 'object' ? deletedData.type : undefined;
      
      const currentMessages = this.messagesSubject.value;
      
      if (deleteType === 'soft') {
        const updatedMessages = currentMessages.map(msg => 
          msg.messageId === messageId 
            ? { 
                ...msg, 
                isDeleted: true,
                deletedAt: deletedData.deletedAt,
                deleteType: 'soft',
              } 
            : msg
        );
        this.messagesSubject.next(updatedMessages);
      } else {
        const updatedMessages = currentMessages.filter(msg => msg.messageId !== messageId);
        this.messagesSubject.next(updatedMessages);
      }
      
      this.refreshChats();
    });

    this.connection.on('ReplyToMessageAsync', (replyData) => {
      const exists = this.messagesSubject.value.some(m => m.messageId === replyData.messageId);
      if (!exists) {
        const replyMessage = {
          messageId: replyData.messageId,
          sender: replyData.sender,
          content: replyData.content,
          sentAt: replyData.sentAt,
          replyFor: replyData.replyTo
        };
        this.messagesSubject.next([...this.messagesSubject.value, replyMessage]);
      }
      this.refreshChats();
    });

    this.connection.on('UpdateChats', (chats) => {
      this.chatsSubject.next(chats ?? []);
    });

    this.connection.on('UserInfoChanged', (userInfo) => {      
      const normalizedUserInfo = {
        NewUserName: userInfo.NewUserName || userInfo.newUserName,
        Image: userInfo.Image || userInfo.image,
        UpdatedAt: userInfo.UpdatedAt || userInfo.updatedAt,
        OldNickName: userInfo.OldNickName || userInfo.oldNickName
      };
      
      this.handleUserInfoChanged(normalizedUserInfo);
    });

    this.loadingSubject.next(true);

    from(this.connection.start())
      .pipe(
        tap(() => {
          this.connected();
        }),
        switchMap(() => {
          return from(this.connection.invoke<TChat[]>(this.methodName));
        }),
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

  protected handleUserInfoChanged(userInfo: { NewUserName: string, Image?: string, UpdatedAt: string, OldNickName: string }): void {    
    const currentMessages = this.messagesSubject.value;
    let messageUpdated = false;
    
    const updatedMessages = currentMessages.map(message => {
      if (message.sender === userInfo.OldNickName || message.sender === userInfo.NewUserName) {
        messageUpdated = true;
        return {
          ...message,
          sender: userInfo.NewUserName,
          senderImage: userInfo.Image || message.senderImage
        };
      }
      return message;
    });
    
    if (messageUpdated) {
      this.messagesSubject.next(updatedMessages);
    }
    this.updateChatUserInfo(userInfo);
    
    setTimeout(() => {
      this.refreshChats();
    }, 50);

    const mappedUserInfo = {
      userName: userInfo.NewUserName,
      image: userInfo.Image,
      updatedAt: userInfo.UpdatedAt,
      oldNickName: userInfo.OldNickName
    };
        
    this.userInfoUpdatedSubject.next(mappedUserInfo);
  }

  protected updateChatUserInfo(userInfo: { NewUserName: string, Image?: string, UpdatedAt: string, OldNickName: string }): void {
    const currentChats = this.chatsSubject.value;
    let hasChanges = false;
    
    const updatedChats = currentChats.map(chat => {
      const chatAny = chat as any;
      
      let shouldUpdate = false;
      const updatedChat = { ...chatAny };
      
      if (chatAny.nickName === userInfo.OldNickName || chatAny.nickName === userInfo.NewUserName) {
        updatedChat.nickName = userInfo.NewUserName;
        shouldUpdate = true;
      }

      if (chatAny.userName === userInfo.OldNickName || chatAny.userName === userInfo.NewUserName) {
        updatedChat.userName = userInfo.NewUserName;
        shouldUpdate = true;
      }

      if (chatAny.name === userInfo.OldNickName || chatAny.name === userInfo.NewUserName) {
        updatedChat.name = userInfo.NewUserName;
        shouldUpdate = true;
      }

      if (chatAny.displayName === userInfo.OldNickName || chatAny.displayName === userInfo.NewUserName) {
        updatedChat.displayName = userInfo.NewUserName;
        shouldUpdate = true;
      }

      if (shouldUpdate && userInfo.Image) {
        updatedChat.image = userInfo.Image;
        updatedChat.userImage = userInfo.Image;
        updatedChat.avatar = userInfo.Image;
        updatedChat.profileImage = userInfo.Image;
      }
      
      if (shouldUpdate) {
        updatedChat.lastUserInfoUpdate = userInfo.UpdatedAt;
        hasChanges = true;
      }
      
      return updatedChat;
    });
    
    if (hasChanges) {
      this.chatsSubject.next(updatedChats);
    } else {
    }
  }

  public refreshChats(): void {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      this.connection.invoke<TChat[]>(this.methodName).then(chats => {
        this.chatsSubject.next(chats ?? []);
      }).catch(err => {
        console.error('Error refreshing chats:', err);
      });
    }
  }

  public loadChatHistory(withUser: string, take: number, skip: number): Observable<any[]> {
    this.currentChatNickName = withUser;
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return of([]);
    }
    return from(
      this.connection.invoke<any[]>(this.loadHistoryMethod, withUser, take, skip)
    ).pipe(
      tap(messages => {
        if (skip === 0) {
          this.messagesSubject.next(messages ?? []);
        }
      }),
      catchError(err => {
        console.error('Error loading chat history:', err);
        return of([]);
      })
    );
  }

  public loadGroupMessageHistory(groupId: string, take: number, skip: number): Observable<any[]> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return of([]);
    }
    return from(
      this.connection.invoke<any[]>(this.loadHistoryMethod, groupId, take, skip)
    ).pipe(
      tap(messages => {
        if (skip === 0) {
          this.messagesSubject.next(messages ?? []);
        }
      }),
      catchError(err => {
        console.error('Error loading group message history:', err);
        return of([]);
      })
    );
  }

  public notifyUserInfoChanged(userInfo: { userName: string, image?: string, updatedAt: string, oldNickName: string }): void {
    const normalizedUserInfo = {
      NewUserName: userInfo.userName,
      Image: userInfo.image,
      UpdatedAt: userInfo.updatedAt,
      OldNickName: userInfo.oldNickName
    };
    
    this.updateChatUserInfo(normalizedUserInfo);
    
    setTimeout(() => {
      this.refreshChats();
    }, 50);
    
    this.userInfoUpdatedSubject.next(userInfo);
  }

  protected abstract getCurrentUser(): string | null;

  protected abstract connected(): void;

  disconnect(): void {
    if (this.connection) {
      this.connection.stop().then(() => {
      }).catch(err => {
        console.error(`[BaseChatApiService] Error disconnecting from ${this.hubUrl}:`, err);
      });
    }
  }
}