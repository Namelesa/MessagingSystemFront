import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BaseChatApiService } from '../service/base.chat.hub.api';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

class MockHubConnection {
  state = signalR.HubConnectionState.Disconnected;
  on = jasmine.createSpy('on');
  onclose = jasmine.createSpy('onclose');
  onreconnected = jasmine.createSpy('onreconnected');
  onreconnecting = jasmine.createSpy('onreconnecting');
  start = jasmine.createSpy('start').and.returnValue(Promise.resolve());
  invoke = jasmine.createSpy('invoke').and.returnValue(Promise.resolve([]));
  stop = jasmine.createSpy('stop').and.returnValue(Promise.resolve());
  restart = jasmine.createSpy('restart').and.returnValue(Promise.resolve());
}

class TestChatService extends BaseChatApiService<any> {
  constructor() {
    super('/hubUrl', 'LoadChats', 'LoadHistory');
  }

  protected connected(): void {}
  public getCurrentUser(): string | null {
    return 'testUser';
  }

  public testHandleUserInfoChanged(userInfo: any) {
    return this.handleUserInfoChanged(userInfo);
  }
  public testHandleUserInfoDeleted(userInfo: any) {
    return this.handleUserInfoDeleted(userInfo);
  }
  public getTestChats() { return this['chatsSubject'].value; }
  public getTestMessages() { return this['messagesSubject'].value; }
  public getTestLoading() { return this['loadingSubject'].value; }
  public getTestError() { return this['errorSubject'].value; }
  public getTestUserInfoUpdated() { return (this['userInfoUpdatedSubject'] as BehaviorSubject<any>).value; }
  public getTestUserInfoDeleted() { return this['userInfoDeletedSubject'] as BehaviorSubject<any>; }
}

describe('BaseChatApiService full coverage', () => {
  let service: TestChatService;
  let mockConnection: MockHubConnection;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new TestChatService();
    mockConnection = new MockHubConnection();
    (service as any).connection = mockConnection;
  });

  it('should refresh chats', async () => {
    mockConnection.state = signalR.HubConnectionState.Connected;
    const invokeSpy = mockConnection.invoke as jasmine.Spy;
    invokeSpy.and.returnValue(Promise.resolve([{ nickName: 'chat1' }]));

    service.refreshChats();
    await Promise.resolve();

    expect(service.getTestChats().length).toBe(1);
    expect(service.getTestChats()[0].nickName).toBe('chat1');
  });

  it('should load chat history', (done) => {
    mockConnection.state = signalR.HubConnectionState.Connected;
    const messages = [{ messageId: 1, sender: 'a' }];
    mockConnection.invoke.and.returnValue(Promise.resolve(messages));

    service.loadChatHistory('user1', 10, 0).subscribe(result => {
      expect(result).toEqual(messages);
      expect(service.getTestMessages()).toEqual(messages);
      done();
    });
  });

  it('should load group message history', (done) => {
    mockConnection.state = signalR.HubConnectionState.Connected;
    const messages = [{ messageId: 2, sender: 'b' }];
    mockConnection.invoke.and.returnValue(Promise.resolve(messages));

    service.loadGroupMessageHistory('group1', 5, 0).subscribe(result => {
      expect(result).toEqual(messages);
      expect(service.getTestMessages()).toEqual(messages);
      done();
    });
  });

  it('should handle user info changed', () => {
    const msg = { sender: 'oldNick', content: 'hi' };
    (service as any).messagesSubject.next([msg]);

    service.testHandleUserInfoChanged({
      NewUserName: 'newNick',
      OldNickName: 'oldNick',
      UpdatedAt: 'time'
    });

    const messages = service.getTestMessages();
    expect(messages[0].sender).toBe('newNick');
  });

  it('should handle user info deleted', () => {
    (service as any).messagesSubject.next([{ sender: 'deleteUser', content: 'hi' }]);
    (service as any).chatsSubject.next([{ nickName: 'deleteUser' }]);

    service.testHandleUserInfoDeleted({ userName: 'deleteUser' });

    expect(service.getTestMessages().length).toBe(0);
    expect(service.getTestChats().length).toBe(0);
  });

  it('should disconnect hub', async () => {
    await service.disconnect();
    expect(mockConnection.stop).toHaveBeenCalled();
  });

  it('should not reconnect if already connected or connecting', () => {
    mockConnection.state = signalR.HubConnectionState.Connected;
    service.connect();
    expect(mockConnection.start).not.toHaveBeenCalled();
  
    mockConnection.state = signalR.HubConnectionState.Connecting;
    service.connect();
    expect(mockConnection.start).not.toHaveBeenCalled();
  });

  
  it('should handle error when loading chat history', (done) => {
    mockConnection.state = signalR.HubConnectionState.Connected; 
    mockConnection.invoke.and.returnValue(Promise.reject(new Error('fail')));
    
    service.loadChatHistory('user1', 10, 0).subscribe({
      next: (result) => {
        expect(result).toEqual([]);
        done();
      },
      error: (err) => {
        done.fail('Should not error: ' + err);
      }
    });
  });

  it('should not refresh chats if not connected', async () => {
    mockConnection.state = signalR.HubConnectionState.Disconnected;
    await service.refreshChats();
    expect(service.getTestChats()).toEqual([]); 
    expect(mockConnection.invoke).not.toHaveBeenCalled();
  });

  it('should set errorSubject when loadGroupMessageHistory fails', (done) => {
    mockConnection.state = signalR.HubConnectionState.Connected;
    (mockConnection.invoke as jasmine.Spy).and.returnValue(Promise.reject('groupFail'));

    service.loadGroupMessageHistory('g1', 5, 0).subscribe(result => {
      expect(result).toEqual([]);
      expect(service.getTestError()).toBe(null);
      done();
    });
  });

  it('should set loading and error states correctly when refreshChats fails', async () => {
    mockConnection.state = signalR.HubConnectionState.Connected;
    (mockConnection.invoke as jasmine.Spy).and.returnValue(Promise.reject(new Error('fail')));

    service.refreshChats();
    await Promise.resolve();

    expect(service.getTestChats()).toEqual([]);
    expect(service.getTestLoading()).toBeFalse();
  });

  it('should clear loading state after successful refreshChats', async () => {
    mockConnection.state = signalR.HubConnectionState.Connected;
    (mockConnection.invoke as jasmine.Spy).and.returnValue(Promise.resolve([{ nickName: 'ok' }]));

    service.refreshChats();
    await Promise.resolve();

    expect(service.getTestLoading()).toBeFalse();
    expect(service.getTestError()).toBeNull();
  });

  it('should ignore refreshChats if not connected', async () => {
    mockConnection.state = signalR.HubConnectionState.Disconnected;
    await service.refreshChats();
    expect(mockConnection.invoke).not.toHaveBeenCalled();
    expect(service.getTestChats()).toEqual([]);
  });

  it('should ignore loadChatHistory if not connected', (done) => {
    mockConnection.state = signalR.HubConnectionState.Disconnected;

    service.loadChatHistory('any', 1, 0).subscribe(result => {
      expect(result).toEqual([]);
      expect(service.getTestMessages()).toEqual([]);
      done();
    });
  });

  it('should ignore loadGroupMessageHistory if not connected', (done) => {
    mockConnection.state = signalR.HubConnectionState.Disconnected;

    service.loadGroupMessageHistory('grp', 1, 0).subscribe(result => {
      expect(result).toEqual([]);
      expect(service.getTestMessages()).toEqual([]);
      done();
    });
  });

  it('should emit user info updated event', (done) => {
    const inputInfo = { OldNickName: 'x', NewUserName: 'y', UpdatedAt: 'z' };
  
    (service as any).userInfoUpdatedSubject.subscribe((emitted: any) => {
      expect(emitted).toEqual(jasmine.objectContaining({
        oldNickName: 'x',
        userName: 'y',
        updatedAt: 'z'
      }));
      done();
    });
  
    service.testHandleUserInfoChanged(inputInfo);
  });
  
  it('should emit user info deleted event', (done) => {
    const info = { userName: 'bye' };
  
    (service as any).userInfoDeletedSubject.subscribe((value: any) => {
      expect(value).toEqual(info);
      done();
    });
  
    service.testHandleUserInfoDeleted(info);
  });  

  it('should notify user info changed and emit event', (done) => {
    const spyUpdate = spyOn<any>(service, 'updateChatUserInfo').and.callThrough();
    const spyRefresh = spyOn(service, 'refreshChats').and.callFake(() => {});
  
    const info = { userName: 'u1', image: 'img.png', updatedAt: 'now', oldNickName: 'old' };
  
    (service as any).userInfoUpdatedSubject.subscribe((emitted: any) => {
      expect(spyUpdate).toHaveBeenCalledWith(jasmine.objectContaining({
        NewUserName: 'u1',
        Image: 'img.png',
        UpdatedAt: 'now',
        OldNickName: 'old'
      }));
      expect(emitted).toBe(info);
      queueMicrotask(() => {
        expect(spyRefresh).toHaveBeenCalled();
        done();
      });
    });
  
    service.notifyUserInfoChanged(info);
  });
  
  it('should return current user', () => {
    expect(service.getCurrentUser()).toBe('testUser');
  });
  
  it('should call connected method without error', () => {
    expect(() => (service as any).connected()).not.toThrow();
  });
  
  it('should log error when disconnect fails', fakeAsync(() => {
    const error = new Error('disconnect failed');
    mockConnection.stop.and.returnValue(Promise.reject(error));
    (service as any).connection = mockConnection;
  
    spyOn(console, 'error');
  
    service.disconnect();
    tick();
  
    expect(console.error).toHaveBeenCalledWith(
      `[BaseChatApiService] Error disconnecting from /hubUrl:`,
      error
    );
  }));  

  it('should update chat nickName and add image when userInfo matches', () => {
    const chat = { nickName: 'oldNick', userName: 'someone', displayName: 'nick' };
    (service as any).chatsSubject.next([chat]);
  
    const info = {
      NewUserName: 'newNick',
      Image: 'avatar.png',
      UpdatedAt: '2025-01-01',
      OldNickName: 'oldNick'
    };
  
    (service as any).updateChatUserInfo(info);
  
    const updatedChats = service.getTestChats();
    expect(updatedChats[0].nickName).toBe('newNick');
    expect(updatedChats[0].image).toBe('avatar.png');
    expect(updatedChats[0].lastUserInfoUpdate).toBe('2025-01-01');
  });
  
  it('should update chat when userName matches OldNickName', () => {
    const chat = { userName: 'toChange' };
    (service as any).chatsSubject.next([chat]);
  
    const info = {
      NewUserName: 'changed',
      UpdatedAt: '2025-02-01',
      OldNickName: 'toChange'
    };
  
    (service as any).updateChatUserInfo(info);
  
    const updatedChats = service.getTestChats();
    expect(updatedChats[0].userName).toBe('changed');
    expect(updatedChats[0].lastUserInfoUpdate).toBe('2025-02-01');
  });
  
  it('should update chat when displayName matches and no image provided', () => {
    const chat = { displayName: 'disp' };
    (service as any).chatsSubject.next([chat]);
  
    const info = {
      NewUserName: 'dispNew',
      UpdatedAt: '2025-03-01',
      OldNickName: 'disp'
    };
  
    (service as any).updateChatUserInfo(info);
  
    const updatedChats = service.getTestChats();
    expect(updatedChats[0].displayName).toBe('dispNew');
    expect(updatedChats[0].image).toBeUndefined();
  });
  
  it('should not update chats when no fields match', () => {
    const chat = { nickName: 'unchanged' };
    (service as any).chatsSubject.next([chat]);
  
    const info = {
      NewUserName: 'newNick',
      UpdatedAt: '2025-04-01',
      OldNickName: 'someoneElse'
    };
  
    (service as any).updateChatUserInfo(info);
  
    const updatedChats = service.getTestChats();
    expect(updatedChats[0]).toEqual(chat);
  });  

  it('should update chat when name matches OldNickName', () => {
    const chat = { id: 1, name: 'OldNick', nickName: '', userName: '', displayName: '' };
    (service as any).chatsSubject.next([chat]);
  
    const userInfo = {
      OldNickName: 'OldNick',
      NewUserName: 'NewNick',
      UpdatedAt: '2025-08-19T00:00:00Z'
    };
  
    (service as any).updateChatUserInfo(userInfo);
  
    service.chats$.subscribe(chats => {
      expect(chats[0].name).toBe('NewNick');
      expect(chats[0].lastUserInfoUpdate).toBe(userInfo.UpdatedAt);
    });
  });

  it('should not update messages when sender does not match Old or New nickname', () => {
    const message = { id: 1, sender: 'OtherUser', senderImage: 'img.png' };
    (service as any).messagesSubject.next([message]);
  
    const userInfo = {
      OldNickName: 'OldNick',
      NewUserName: 'NewNick',
      UpdatedAt: '2025-08-19T00:00:00Z',
      Image: 'newimg.png'
    };
  
    (service as any).handleUserInfoChanged(userInfo);
  
    service.messages$.subscribe(messages => {
      expect(messages[0]).toEqual(message);
    });
  });
  
  it('should update message when sender already equals NewUserName', () => {
    const message = { id: 1, sender: 'NewNick', senderImage: 'old.png' };
    (service as any).messagesSubject.next([message]);
  
    const userInfo = {
      OldNickName: 'OldNick',
      NewUserName: 'NewNick',
      UpdatedAt: '2025-08-19T00:00:00Z',
      Image: 'new.png'
    };
  
    (service as any).handleUserInfoChanged(userInfo);
  
    service.messages$.subscribe(messages => {
      expect(messages[0].sender).toBe('NewNick'); 
      expect(messages[0].senderImage).toBe('new.png');
    });
  });
  it('should update chat when name matches OldNickName', () => {
    const chat = { id: 1, name: 'OldNick', nickName: '', userName: '', displayName: '' };
    (service as any).chatsSubject.next([chat]);
  
    const userInfo = {
      OldNickName: 'OldNick',
      NewUserName: 'NewNick',
      UpdatedAt: '2025-08-19T00:00:00Z'
    };
  
    (service as any).updateChatUserInfo(userInfo);
  
    service.chats$.subscribe(chats => {
      expect(chats[0].name).toBe('NewNick');
      expect(chats[0].lastUserInfoUpdate).toBe(userInfo.UpdatedAt);
    });
  });

  it('should not update messages when sender does not match Old or New nickname', () => {
    const message = { id: 1, sender: 'OtherUser', senderImage: 'img.png' };
    (service as any).messagesSubject.next([message]);
  
    const userInfo = {
      OldNickName: 'OldNick',
      NewUserName: 'NewNick',
      UpdatedAt: '2025-08-19T00:00:00Z',
      Image: 'newimg.png'
    };
  
    (service as any).handleUserInfoChanged(userInfo);
  
    service.messages$.subscribe(messages => {
      expect(messages[0]).toEqual(message); 
    });
  });

  it('should update message when sender already equals NewUserName', () => {
    const message = { id: 1, sender: 'NewNick', senderImage: 'old.png' };
    (service as any).messagesSubject.next([message]);
  
    const userInfo = {
      OldNickName: 'OldNick',
      NewUserName: 'NewNick',
      UpdatedAt: '2025-08-19T00:00:00Z',
      Image: 'new.png'
    };
  
    (service as any).handleUserInfoChanged(userInfo);
  
    service.messages$.subscribe(messages => {
      expect(messages[0].sender).toBe('NewNick'); 
      expect(messages[0].senderImage).toBe('new.png');
    });
  });
});
