import { TestBed } from '@angular/core/testing';
import { GroupMessagesApiService } from './group-messages.api';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import * as signalR from '@microsoft/signalr';
import { GroupMessage } from '../../../../entities/group-message';

class MockHubConnection {
  state = signalR.HubConnectionState.Connected;
  private handlers: Record<string, Function[]> = {};
  on = jasmine.createSpy('on').and.callFake((event, cb) => {
    this.handlers[event] = this.handlers[event] || [];
    this.handlers[event].push(cb);
  });
  off = jasmine.createSpy('off');
  invoke = jasmine.createSpy('invoke').and.returnValue(Promise.resolve([]));
  trigger(event: string, data?: any) {
    (this.handlers[event] || []).forEach(cb => cb(data));
  }
}

class MockRegistryService {
  connection = new MockHubConnection();
  getConnection = jasmine.createSpy('getConnection').and.callFake(() => this.connection);
  waitForConnection = jasmine.createSpy('waitForConnection').and.callFake(() => Promise.resolve(this.connection));
}

describe('GroupMessagesApiService', () => {
  let service: GroupMessagesApiService;
  let registry: MockRegistryService;
  let connection: MockHubConnection;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GroupMessagesApiService,
        { provide: SignalRConnectionRegistryService, useClass: MockRegistryService }
      ]
    });
    service = TestBed.inject(GroupMessagesApiService);
    registry = TestBed.inject(SignalRConnectionRegistryService) as any;
    connection = registry.connection;
  });

  it('should load chat history and set messages', async () => {
    const messages = [{ id: '1', groupId: 'g1', sender: 'u1', content: 'c', sendTime: 't', isEdited: false, isDeleted: false }];
    connection.invoke.and.returnValue(Promise.resolve(messages));
    const result = await service.loadChatHistory('g1').toPromise();
    expect(result).toEqual(messages);
    expect(service.messages$.value).toEqual(messages);
  });

  it('should handle ReceiveMessage event', () => {
    service['currentGroupId'] = 'g1';
    service['setupMessageListener']();
    connection.trigger('ReceiveMessage', { id: '1', groupId: 'g1', sender: 'u1', content: 'c', sendTime: 't' });
    expect(service.messages$.value.length).toBe(1);
    expect(service.messages$.value[0].content).toBe('c');
  });

  it('should handle MessageEdited event', () => {
    service.messages$.next([{ id: '1', groupId: 'g1', sender: 'u1', content: 'old', sendTime: 't', isEdited: false, isDeleted: false }]);
    service['setupMessageListener']();
    connection.trigger('MessageEdited', { messageId: '1', newContent: 'new', editedAt: 'now' });
    expect(service.messages$.value[0].content).toBe('new');
    expect(service.messages$.value[0].isEdited).toBeTrue();
  });

  it('should handle MessageDeleted event', () => {
    service.messages$.next([{ id: '1', groupId: 'g1', sender: 'u1', content: 'x', sendTime: 't', isEdited: false, isDeleted: false }]);
    service['setupMessageListener']();
    connection.trigger('MessageDeleted', { messageId: '1' });
    expect(service.messages$.value.length).toBe(0);
  });

  it('should handle MessageSoftDeleted event', () => {
    service.messages$.next([{ id: '1', groupId: 'g1', sender: 'u1', content: 'x', sendTime: 't', isEdited: false, isDeleted: false }]);
    service['setupMessageListener']();
    connection.trigger('MessageSoftDeleted', { messageId: '1' });
    expect(service.messages$.value[0].isDeleted).toBeTrue();
  });

  it('should handle UserInfoChanged event', (done) => {
    service['setupMessageListener']();
    service.userInfoChanged$.subscribe(info => {
      expect(info.userName).toBe('newU');
      expect(info.oldNickName).toBe('oldU');
      done();
    });
    connection.trigger('UserInfoChanged', { NewUserName: 'newU', OldNickName: 'oldU', UpdatedAt: 'now', Image: 'img' });
  });

  it('should handle UserInfoDeleted event', () => {
    service.messages$.next([
      { id: '1', groupId: 'g1', sender: 'badUser', content: 'x', sendTime: 't', isEdited: false, isDeleted: false }
    ]);
    service['setupMessageListener']();
    connection.trigger('UserInfoDeleted', { userName: 'badUser' });
    expect(service.messages$.value.length).toBe(0);
  });

  it('should handle MessageReplied event', () => {
    service['currentGroupId'] = 'g1';
    service['setupMessageListener']();
    connection.trigger('MessageReplied', {
      messageId: '99',
      groupId: 'g1',
      sender: 'u1',
      content: 'reply content',
      sentAt: 'now',
      replyTo: '1'
    });

    const msgs = service.messages$.value;
    expect(msgs.length).toBe(1);
    expect(msgs[0].replyFor).toBe('1');
    expect(msgs[0].content).toBe('reply content');
  });

  it('should join group only when skip=0', async () => {
    await service.loadChatHistory('g1', 20, 0).toPromise();
    expect(connection.invoke).toHaveBeenCalledWith('JoinGroupAsync', 'g1');

    connection.invoke.calls.reset();
    await service.loadChatHistory('g1', 20, 10).toPromise();
    expect(connection.invoke).not.toHaveBeenCalledWith('JoinGroupAsync', 'g1');
  });

  it('should prepend new messages when skip > 0', async () => {
    service.messages$.next([{ id: '1', groupId: 'g1', sender: 'a', content: 'x', sendTime: 't', isEdited: false, isDeleted: false }]);

    const newMsgs = [
      { id: '2', groupId: 'g1', sender: 'b', content: 'y', sendTime: 't2', isEdited: false, isDeleted: false }
    ];
    connection.invoke.and.callFake((method) => {
      if (method === 'LoadChatHistoryAsync') return Promise.resolve(newMsgs);
      return Promise.resolve();
    });

    await service.loadChatHistory('g1', 20, 20).toPromise();
    const values = service.messages$.value;
    expect(values[0].id).toBe('2');
    expect(values[1].id).toBe('1');
  });

  it('should call LeaveGroupAsync on cleanup', async () => {
    service['currentGroupId'] = 'g1';
    await service.cleanup();
    expect(connection.invoke).toHaveBeenCalledWith('LeaveGroupAsync', 'g1');
    expect(service.messages$.value).toEqual([]);
  });

  it('should send, edit, delete, softDelete and reply messages', async () => {
    await service.sendMessage('g1', 'hi');
    expect(connection.invoke).toHaveBeenCalledWith('SendMessageAsync', 'hi', 'g1');

    await service.editMessage('m1', 'edited', 'g1');
    expect(connection.invoke).toHaveBeenCalledWith('EditMessageAsync', 'm1', 'edited', 'g1');

    await service.deleteMessage('m1', 'g1');
    expect(connection.invoke).toHaveBeenCalledWith('DeleteMessageAsync', 'm1', 'g1');

    await service.softDeleteMessage('m1', 'g1');
    expect(connection.invoke).toHaveBeenCalledWith('SoftDeleteMessageAsync', 'm1', 'g1');

    await service.replyToMessage('m1', 'reply', 'g1');
    expect(connection.invoke).toHaveBeenCalledWith('ReplyForMessageAsync', 'm1', 'reply', 'g1');
  });

  it('should ignore ReceiveMessage if groupId does not match', () => {
    service['currentGroupId'] = 'g1';
    service['setupMessageListener']();
    connection.trigger('ReceiveMessage', { id: '1', groupId: 'other', sender: 'u1', content: 'zzz', sendTime: 't' });
    expect(service.messages$.value.length).toBe(0);
  });

  it('should handle error in loadChatHistory', async () => {
    connection.invoke.and.callFake(() => { throw new Error('boom'); });
    let error: any;
    try {
      await service.loadChatHistory('g1').toPromise();
    } catch (e) {
      error = e;
    }
    expect(error).toBeTruthy();
  });

  it('should not setup listeners if no connection', () => {
    spyOn(service as any, 'getConnection').and.returnValue(null);
    (service as any).setupMessageListener();
    expect((service as any).listenersSetup).toBeFalse();
  });

  it('should warn if removing listeners throws error', () => {
    const badConn: any = {
      off: () => { throw new Error('boom'); },
      on: jasmine.createSpy('on')
    };
    spyOn(service as any, 'getConnection').and.returnValue(badConn);
    spyOn(console, 'warn');
    (service as any).setupMessageListener();
    expect(console.warn).toHaveBeenCalledWith('Error removing listeners:', jasmine.any(Error));
  });

  it('should not add duplicate message on ReceiveMessage', () => {
    (service as any).currentGroupId = 'g1';
    (service as any).setupMessageListener();
    const msg = { id: 'm1', groupId: 'g1', sender: 'u', content: 'hi', sendTime: 't' };
    connection.trigger('ReceiveMessage', msg);
    connection.trigger('ReceiveMessage', msg); 
    expect(service.messages$.value.length).toBe(1);
  });

  it('should not add duplicate message on MessageReplied', () => {
    (service as any).currentGroupId = 'g1';
    service.messages$.next([{ id: '99', groupId: 'g1', sender: 'x', content: 'old', sendTime: 't', isEdited: false, isDeleted: false }]);
    (service as any).setupMessageListener();
    connection.trigger('MessageReplied', {
      messageId: '99',
      groupId: 'g1',
      sender: 'y',
      content: 'reply',
      sentAt: 't2',
      replyTo: '42'
    });
    expect(service.messages$.value.length).toBe(1);
  });

  it('should soft delete a message', () => {
    service.messages$.next([{ id: '1', groupId: 'g1', sender: 'a', content: 'x', sendTime: 't', isEdited: false, isDeleted: false }]);
    (service as any).setupMessageListener();
    connection.trigger('MessageSoftDeleted', { messageId: '1' });
    expect(service.messages$.value[0].isDeleted).toBeTrue();
  });

  it('should delete a message by id', () => {
    service.messages$.next([{ id: 'delMe', groupId: 'g1', sender: 'a', content: 'x', sendTime: 't', isEdited: false, isDeleted: false }]);
    (service as any).setupMessageListener();
    connection.trigger('MessageDeleted', { messageId: 'delMe' });
    expect(service.messages$.value.length).toBe(0);
  });

  it('should keep message unchanged if editInfo.id does not match', () => {
    service.messages$.next([{ id: '1', groupId: 'g1', sender: 'a', content: 'x', sendTime: 't', isEdited: false, isDeleted: false }]);
    (service as any).setupMessageListener();
    connection.trigger('MessageEdited', { messageId: 'notExisting', newContent: 'zzz', editedAt: 'now' });
    expect(service.messages$.value[0].content).toBe('x');
  });

  describe('handleUserInfoDeleted', () => {
    it('should log error if userName is empty', () => {
      spyOn(console, 'error');
      (service as any).handleUserInfoDeleted('');
      expect(console.error).toHaveBeenCalledWith('No valid userName found for deletion');
    });

    it('should remove messages with given userName', () => {
      const msgs: GroupMessage[] = [
        { id: '1', groupId: 'g', sender: 'john', content: 'hi', sendTime: new Date().toString(), isEdited: false, isDeleted: false },
        { id: '2', groupId: 'g', sender: 'doe', content: 'yo', sendTime: new Date().toString(), isEdited: false, isDeleted: false }
      ];
      service.messages$.next(msgs);

      (service as any).handleUserInfoDeleted('john');

      expect(service.messages$.value.length).toBe(1);
      expect(service.messages$.value[0].sender).toBe('doe');
    });

    it('should not update if no messages match', () => {
      const msgs: GroupMessage[] = [
        { id: '1', groupId: 'g', sender: 'alice', content: 'hi', sendTime: new Date().toString(), isEdited: false, isDeleted: false }
      ];
      service.messages$.next(msgs);

      (service as any).handleUserInfoDeleted('bob');

      expect(service.messages$.value).toEqual(msgs); // unchanged
    });
  });

  describe('handleUserInfoChanged', () => {
    it('should update sender when OldNickName matches', () => {
      const msgs: GroupMessage[] = [
        { id: '1', groupId: 'g', sender: 'oldName', content: 'test', sendTime: new Date().toString(), isEdited: false, isDeleted: false }
      ];
      service.messages$.next(msgs);

      (service as any).handleUserInfoChanged({
        NewUserName: 'newName',
        Image: undefined,
        UpdatedAt: '2025-01-01',
        OldNickName: 'oldName'
      });

      expect(service.messages$.value[0].sender).toBe('newName');
    });

    it('should update sender when NewUserName matches', () => {
      const msgs: GroupMessage[] = [
        { id: '1', groupId: 'g', sender: 'newName', content: 'test', sendTime: new Date().toString(), isEdited: false, isDeleted: false }
      ];
      service.messages$.next(msgs);

      (service as any).handleUserInfoChanged({
        NewUserName: 'newName',
        Image: undefined,
        UpdatedAt: '2025-01-01',
        OldNickName: 'oldName'
      });

      expect(service.messages$.value[0].sender).toBe('newName');
    });

    it('should attach senderImage when Image is provided', () => {
      const msgs: GroupMessage[] = [
        { id: '1', groupId: 'g', sender: 'oldName', content: 'img test', sendTime: new Date().toString(), isEdited: false, isDeleted: false }
      ];
      service.messages$.next(msgs);

      (service as any).handleUserInfoChanged({
        NewUserName: 'newName',
        Image: 'avatar.png',
        UpdatedAt: '2025-01-01',
        OldNickName: 'oldName'
      });

      expect((service.messages$.value[0] as any).senderImage).toBe('avatar.png');
    });

    it('should not change messages if no match', () => {
      const msgs: GroupMessage[] = [
        { id: '1', groupId: 'g', sender: 'someoneElse', content: 'msg', sendTime: new Date().toString(), isEdited: false, isDeleted: false }
      ];
      service.messages$.next(msgs);

      (service as any).handleUserInfoChanged({
        NewUserName: 'newName',
        Image: undefined,
        UpdatedAt: '2025-01-01',
        OldNickName: 'oldName'
      });

      expect(service.messages$.value).toEqual(msgs);
    });
  });

  it('should return null if connection is not connected', () => {
    const badConn: any = { state: signalR.HubConnectionState.Disconnected };
    registry.getConnection.and.returnValue(badConn);
    const result = (service as any).getConnection();
    expect(result).toBeNull();
  });

  it('should wait for connection if getConnection returns null', async () => {
    spyOn(service as any, 'getConnection').and.returnValue(null);
  
    const fakeConn = new MockHubConnection();
    registry.waitForConnection.and.returnValue(Promise.resolve(fakeConn));
  
    const result = await (service as any).ensureConnection();
    expect(result).toBe(fakeConn);
    expect(registry.waitForConnection).toHaveBeenCalledWith('groupChat', 20, 150);
  });

  
  it('should log error if leaveCurrentGroup fails', async () => {
    service['currentGroupId'] = 'g1';
    const badConn: any = { 
      state: signalR.HubConnectionState.Connected,
      invoke: jasmine.createSpy('invoke').and.throwError('boom') 
    };
    spyOn(service as any, 'getConnection').and.returnValue(badConn);
    spyOn(console, 'error');
  
    await (service as any).leaveCurrentGroup();
  
    expect(console.error).toHaveBeenCalledWith('Error leaving group:', jasmine.any(Error));
  });  

  it('should leave message unchanged if MessageSoftDeleted id does not match', () => {
    const msgs: GroupMessage[] = [
      { id: '1', groupId: 'g1', sender: 'u', content: 'c', sendTime: 't', isEdited: false, isDeleted: false }
    ];
    service.messages$.next(msgs);
    (service as any).setupMessageListener();
  
    connection.trigger('MessageSoftDeleted', { messageId: 'not-existing' });
  
    expect(service.messages$.value[0]).toEqual(msgs[0]); // unchanged
  });

  it('should delete message when deleteInfo is just an id', () => {
    const msgs: GroupMessage[] = [
      { id: 'toDelete', groupId: 'g1', sender: 'u', content: 'c', sendTime: 't', isEdited: false, isDeleted: false }
    ];
    service.messages$.next(msgs);
    (service as any).setupMessageListener();
  
    connection.trigger('MessageDeleted', 'toDelete');
  
    expect(service.messages$.value.length).toBe(0);
  });

  it('should return empty array if LoadChatHistoryAsync returns null', async () => {
    connection.invoke.and.callFake((method) => {
      if (method === 'LoadChatHistoryAsync') return Promise.resolve(null);
      return Promise.resolve();
    });
  
    const result = await service.loadChatHistory('g1').toPromise();
    expect(result).toEqual([]); 
  });
  
  it('should normalize userInfoChanged with lowercase keys', (done) => {
    (service as any).setupMessageListener();
  
    service.userInfoChanged$.subscribe(info => {
      expect(info.userName).toBe('newUser');
      expect(info.image).toBe('pic.png');
      expect(info.updatedAt).toBe('yesterday');
      expect(info.oldNickName).toBe('oldUser');
      done();
    });
  
    connection.trigger('UserInfoChanged', { 
      newUserName: 'newUser',
      image: '  pic.png  ',
      updatedAt: 'yesterday',
      oldNickName: 'oldUser'
    });
  });

  it('should handle UserInfoDeleted with nested userInfo.userName', () => {
    const msgs: GroupMessage[] = [
      { id: '1', groupId: 'g1', sender: 'nestedUser', content: 'c', sendTime: 't', isEdited: false, isDeleted: false }
    ];
    service.messages$.next(msgs);
    (service as any).setupMessageListener();
  
    connection.trigger('UserInfoDeleted', { userInfo: { userName: 'nestedUser' } });
  
    expect(service.messages$.value.length).toBe(0);
  }); 
});