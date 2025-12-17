import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GroupChatApiService } from './group-chat-hub.api';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import { AuthService } from '../../../../entities/session';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../../shared/api-urls';
import { GroupChat } from '../../model/group.chat';

class MockHubConnection {
    state = signalR.HubConnectionState.Connected;
  
    private handlers: Record<string, Function[]> = {};
    private oncloseCb?: () => void;
    private onreconnectedCb?: (...args: any[]) => void;
  
    on = jasmine.createSpy('on').and.callFake((event, cb) => {
      this.handlers[event] = this.handlers[event] || [];
      this.handlers[event].push(cb);
    });
  
    off = jasmine.createSpy('off');
  
    onclose = jasmine.createSpy('onclose').and.callFake((cb: () => void) => {
      this.oncloseCb = cb;
    });
  
    onreconnected = jasmine.createSpy('onreconnected').and.callFake((cb: (...args:any[]) => void) => {
      this.onreconnectedCb = cb;
    });
  
    invoke = jasmine.createSpy('invoke').and.returnValue(Promise.resolve([]));
  
    trigger(event: string, data?: any) {
      (this.handlers[event] || []).forEach(cb => cb(data));
    }

    triggerClose() {
      if (this.oncloseCb) this.oncloseCb();
    }
  
    triggerReconnected(...args:any[]) {
      if (this.onreconnectedCb) this.onreconnectedCb(...args);
    }
  }  

class MockRegistryService {
  connection = new MockHubConnection();
  setConnection = jasmine.createSpy('setConnection');
}

class MockAuthService {
  getNickName = jasmine.createSpy('getNickName').and.returnValue('currentUser');
}

describe('GroupChatApiService', () => {
  let service: GroupChatApiService;
  let registry: MockRegistryService;
  let auth: MockAuthService;
  let connection: MockHubConnection;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GroupChatApiService,
        { provide: SignalRConnectionRegistryService, useClass: MockRegistryService },
        { provide: AuthService, useClass: MockAuthService }
      ]
    });
    service = TestBed.inject(GroupChatApiService);
    spyOn(console, 'error');
    registry = TestBed.inject(SignalRConnectionRegistryService) as any;
    auth = TestBed.inject(AuthService) as any;
    connection = registry.connection;
    httpMock = TestBed.inject(HttpTestingController);
    (service as any).connection = connection;
  });

  afterEach(() => {
    httpMock.verify();
    (console.error as jasmine.Spy).calls.reset();
  });

  it('should join group when connected', async () => {
    await service.joinGroup('g1');
    expect(connection.invoke).toHaveBeenCalledWith('JoinGroupAsync', 'g1');
  });

  it('should leave group', async () => {
    await service.leaveGroup('g1');
    expect(connection.invoke).toHaveBeenCalledWith('LeaveGroupAsync', 'g1');
  });

  it('should delete group and refresh', async () => {
    spyOn(service, 'refreshGroups');
    await service.deleteGroup('g1');
    expect(connection.invoke).toHaveBeenCalledWith('DeleteGroupAsync', 'g1');
    expect(service.refreshGroups).toHaveBeenCalled();
  });

  it('should refresh groups', async () => {
    connection.invoke.and.returnValue(Promise.resolve([{ groupId: 'g1', admin: 'x' }]));
    (service as any).chatsSubject.next([{ groupId: 'g1', admin: 'y' }]);
    await service.refreshGroups();
    expect(service['chatsSubject'].value[0].admin).toBe('x');
  });

  it('should add group members', async () => {
    const result = { groupId: 'g1' } as GroupChat;
    connection.invoke.and.returnValue(Promise.resolve(result));
    const group = await service.addGroupMembers('g1', { users: ['a'] });
    expect(group).toEqual(result);
  });

  it('should remove group members', async () => {
    const result = { groupId: 'g1' } as GroupChat;
    connection.invoke.and.returnValue(Promise.resolve(result));
    const group = await service.removeGroupMembers('g1', { users: ['a'] });
    expect(group).toEqual(result);
  });

  it('should handle DeleteGroupAsync event', () => {
    service.connected();
    service['chatsSubject'].next([{ groupId: 'g1', admin: 'a' } as any]);
    connection.trigger('DeleteGroupAsync', 'g1');
    expect(service['chatsSubject'].value.length).toBe(0);
  });

  it('should handle CreateGroupAsync event', () => {
    service.connected();
    service['chatsSubject'].next([]);
    connection.trigger('CreateGroupAsync', { groupId: 'g2' } as any);
    expect(service['chatsSubject'].value[0].groupId).toBe('g2');
  });

  it('should handle EditGroupAsync event', () => {
    service.connected();
    const group = { groupId: 'g1', admin: 'a' } as any;
    service['chatsSubject'].next([group]);
    connection.trigger('EditGroupAsync', { groupId: 'g1', admin: 'b' });
    expect(service['chatsSubject'].value[0].admin).toBe('b');
  });

  it('should handle UserRemovedFromGroup event', () => {
    service.connected();
    service['chatsSubject'].next([{ groupId: 'g1', admin: 'a' } as any]);
    connection.trigger('UserRemovedFromGroup', { groupId: 'g1' });
    expect(service['chatsSubject'].value.length).toBe(0);
  });

  it('should handle UserInfoDeleted event', () => {
    service.connected();
    service['chatsSubject'].next([{ groupId: 'g1', admin: 'badUser', users: ['badUser'], members: [{ nickName: 'badUser' }] } as any]);
    connection.trigger('UserInfoDeleted', { userName: 'badUser' });
    expect(service['chatsSubject'].value[0].admin).toBe('');
    expect(service['chatsSubject'].value[0].users.length).toBe(0);
    expect(service['chatsSubject'].value[0].members.length).toBe(0);
  }); 

  it('connected() should register onreconnected/onclose and execute their callbacks', () => {
    service.connected();
  
    expect(connection.onreconnected).toHaveBeenCalledWith(jasmine.any(Function));
    expect(connection.onclose).toHaveBeenCalledWith(jasmine.any(Function));
  
    connection.triggerReconnected('some-conn-id');
    connection.triggerClose();
  });  

  it('connected() should early-return when called twice (idempotent)', () => {
    service.connected();
    expect(registry.setConnection).toHaveBeenCalledTimes(1);
    expect(connection.onreconnected).toHaveBeenCalledTimes(1);
    expect(connection.onclose).toHaveBeenCalledTimes(1);
  
    service.connected();
    expect(registry.setConnection).toHaveBeenCalledTimes(1);
    expect(connection.onreconnected).toHaveBeenCalledTimes(1);
    expect(connection.onclose).toHaveBeenCalledTimes(1);
  });

  it('connected() should wrap connection.on but events still trigger handlers', () => {
    const originalOnRef = connection.on; 
  
    service.connected();
  
    expect(connection.on).not.toBe(originalOnRef);
  
    const customHandler = jasmine.createSpy('customHandler');
    connection.on('CustomEvent', customHandler);
  
    connection.trigger('CustomEvent', { foo: 123 });
    expect(customHandler).toHaveBeenCalledWith({ foo: 123 });
  });  

  it('isUserInGroupMembers should return true if user is in group.users', () => {
    const group = { users: ['alice', 'bob'], members: [] } as any;
    const result = (service as any).isUserInGroupMembers(group, 'bob');
    expect(result).toBeTrue();
  });
  
  it('isUserInGroupMembers should return true if user is in group.members', () => {
    const group = { users: [], members: [{ nickName: 'charlie' }] } as any;
    const result = (service as any).isUserInGroupMembers(group, 'charlie');
    expect(result).toBeTrue();
  });
  
  it('isUserInGroupMembers should return false if user not found', () => {
    const group = { users: ['alice'], members: [{ nickName: 'bob' }] } as any;
    const result = (service as any).isUserInGroupMembers(group, 'david');
    expect(result).toBeFalse();
  });
    
  it('should call createGroup with correct FormData', () => {
    const data = {
      Users: [' alice ', ''],
      Admin: 'adminUser',
      Name: 'TestGroup'
    } as any;

    service.createGroup(data).subscribe();

    const req = httpMock.expectOne(`${environment.groupApiUrl}create-group`);
    expect(req.request.method).toBe('POST');

    const formData = req.request.body as FormData;
    expect(formData.getAll('Users')).toEqual(['alice']);
    expect(formData.get('Admin')).toBe('adminUser');
    expect(formData.get('Name')).toBe('TestGroup');

    req.flush({ ok: true });
  });

  it('should skip Admin if empty in createGroup', () => {
    const data = { Users: ['u1'], Admin: '', Name: 'x' } as any;
    service.createGroup(data).subscribe();

    const req = httpMock.expectOne(`${environment.groupApiUrl}create-group`);
    const formData = req.request.body as FormData;
    expect(formData.get('Admin')).toBeNull();
    req.flush({ ok: true });
  });

  it('should handle GroupMembersAdded when user is admin', () => {
    service.connected();
    auth.getNickName.and.returnValue('adminUser');

    const updatedGroup = { groupId: 'g1', admin: 'adminUser', users: [], members: [] } as any;
    service['chatsSubject'].next([]);

    connection.trigger('GroupMembersAdded', updatedGroup);
    expect(service['chatsSubject'].value[0].groupId).toBe('g1');
  });

  it('should handle GroupMembersAdded when user is member', () => {
    service.connected();
    auth.getNickName.and.returnValue('bob');

    const updatedGroup = { groupId: 'g1', admin: 'adminUser', users: [], members: [{ nickName: 'bob' }] } as any;
    service['chatsSubject'].next([]);

    connection.trigger('GroupMembersAdded', updatedGroup);
    expect(service['chatsSubject'].value[0].members[0].nickName).toBe('bob');
  });

  it('should handle GroupMembersAdded when user not in group', () => {
    service.connected();
    auth.getNickName.and.returnValue('ghost');

    const updatedGroup = { groupId: 'g1', admin: 'adminUser', users: [], members: [] } as any;
    service['chatsSubject'].next([updatedGroup]);

    connection.trigger('GroupMembersAdded', updatedGroup);
    expect(service['chatsSubject'].value.length).toBe(0);
  });

  it('should handle GroupMembersRemoved keeping user as admin', () => {
    service.connected();
    auth.getNickName.and.returnValue('adminUser');

    const updatedGroup = { groupId: 'g1', admin: 'adminUser', users: [], members: [] } as any;
    service['chatsSubject'].next([updatedGroup]);

    connection.trigger('GroupMembersRemoved', updatedGroup);
    expect(service['chatsSubject'].value[0].admin).toBe('adminUser');
  });

  it('should handle GroupMembersRemoved when user removed', () => {
    service.connected();
    auth.getNickName.and.returnValue('ghost');

    const updatedGroup = { groupId: 'g1', admin: 'adminUser', users: [], members: [] } as any;
    service['chatsSubject'].next([updatedGroup]);

    connection.trigger('GroupMembersRemoved', updatedGroup);
    expect(service['chatsSubject'].value.length).toBe(0);
  });

  it('should updateGroupsUserInfo: update admin, users and members', () => {
    const oldGroup = {
      groupId: 'g1',
      admin: 'oldName',
      users: ['oldName'],
      members: [{ nickName: 'oldName', image: '' }]
    } as any;
    service['chatsSubject'].next([oldGroup]);

    const info = { OldNickName: 'oldName', NewUserName: 'newName', Image: 'img.png', UpdatedAt: '' };
    (service as any).updateGroupsUserInfo(info);

    const updated = service['chatsSubject'].value[0];
    expect(updated.admin).toBe('newName');
    expect(updated.users).toContain('newName');
    expect(updated.members[0].nickName).toBe('newName');
    expect(updated.members[0].image).toBe('img.png');
  });

  it('handleUserInfoChanged should call updateGroupsUserInfo', () => {
    const spy = spyOn<any>(service, 'updateGroupsUserInfo');
    const info = { OldNickName: 'x', NewUserName: 'y', UpdatedAt: '' };
    (service as any).handleUserInfoChanged(info);
    expect(spy).toHaveBeenCalledWith(info);
  });

  it('should handle GroupMembersAdded when group already exists → update it', () => {
    service.connected();
    auth.getNickName.and.returnValue('currentUser');

    const oldGroup = { groupId: 'g1', admin: 'currentUser', users: [], members: [] } as any;
    const updatedGroup = { groupId: 'g1', admin: 'currentUser', users: ['x'], members: [] } as any;

    service['chatsSubject'].next([oldGroup]);

    connection.trigger('GroupMembersAdded', updatedGroup);

    expect(service['chatsSubject'].value.length).toBe(1);
    expect(service['chatsSubject'].value[0].users).toContain('x');
  });

  it('EditGroupAsync: updates only matching group and keeps others (same ref)', () => {
    service.connected();
  
    const g1 = { groupId: 'g1', admin: 'a' } as any;
    const g2 = { groupId: 'g2', admin: 'b' } as any;
    service['chatsSubject'].next([g1, g2]);
  
    connection.trigger('EditGroupAsync', { groupId: 'g1', admin: 'x' });
  
    const arr = service['chatsSubject'].value;
    expect(arr.length).toBe(2);
    expect(arr[0].admin).toBe('x');    
    expect(arr[1]).toBe(g2);           
  });
  
  it('GroupMembersAdded: group exists -> updates only that group, others keep same ref', () => {
    service.connected();
    auth.getNickName.and.returnValue('currentUser');
  
    const other = { groupId: 'g1', admin: 'z' } as any;
    const existing = { groupId: 'g2', admin: 'currentUser', users: [] } as any;
    service['chatsSubject'].next([other, existing]);
  
    const updatedGroup = { groupId: 'g2', admin: 'currentUser', users: ['x'] } as any;
    connection.trigger('GroupMembersAdded', updatedGroup);
  
    const arr = service['chatsSubject'].value;
    expect(arr.length).toBe(2);
    expect(arr[0]).toBe(other);            
    expect(arr[1].users).toEqual(['x']);   
  });
  
  it('GroupMembersRemoved: updates only matching group, others keep same ref', () => {
    service.connected();
    auth.getNickName.and.returnValue('adminUser'); 
  
    const other = { groupId: 'g1', admin: 'zzz', users: ['a'] } as any;
    const target = { groupId: 'g2', admin: 'adminUser', users: ['b'] } as any;
    service['chatsSubject'].next([other, target]);
  
    const updated = { groupId: 'g2', admin: 'adminUser', users: [] } as any;
    connection.trigger('GroupMembersRemoved', updated);
  
    const arr = service['chatsSubject'].value;
    expect(arr.length).toBe(2);
    expect(arr[0]).toBe(other);          
    expect(arr[1].users.length).toBe(0); 
  });

  it('joinGroup should log error and rethrow when invoke fails', async () => {
    connection.state = signalR.HubConnectionState.Connected;
    const testErr = new Error('Join failed');
    connection.invoke.and.returnValue(Promise.reject(testErr));

    await expectAsync(service.joinGroup('g1')).toBeRejectedWith(testErr);

    expect(console.error).toHaveBeenCalledWith('Error joining group:', testErr);
  });

  it('joinGroup should reject if connection not established', async () => {
    service['connection'] = null as any;
    await expectAsync(service.joinGroup('g1')).toBeRejectedWith('Connection is not established');
  });

  it('leaveGroup should reject if connection not established', async () => {
    service['connection'] = null as any;
    await expectAsync(service.leaveGroup('g1')).toBeRejectedWith('Connection is not established');
  });

  it('deleteGroup should reject if connection not established', async () => {
    service['connection'] = null as any;
    await expectAsync(service.deleteGroup('g1')).toBeRejectedWith('SignalR connection is not established');
  });

  it('refreshGroups should early-return when connection not established', () => {
    service['connection'] = null as any;
    const spy = spyOn(service['chatsSubject'], 'next');

    service.refreshGroups();

    expect(spy).not.toHaveBeenCalled();
  });
  
  describe('GroupChatApiService - addGroupMembers/removeGroupMembers errors', () => {
    beforeEach(() => {
      service['connection'] = null as any;
    });
  
    it('addGroupMembers: should reject when connection not established', async () => {
      await expectAsync(
        service.addGroupMembers('g1', { users: ['a'] })
      ).toBeRejectedWith('SignalR connection is not established');
    });
  
    it('removeGroupMembers: should reject when connection not established', async () => {
      await expectAsync(
        service.removeGroupMembers('g1', { users: ['a'] })
      ).toBeRejectedWith('SignalR connection is not established');
    });
  
      it('joinGroup should reject if connection not established', async () => {
          service['connection'] = null as any;
          await expectAsync(service.joinGroup('g1')).toBeRejectedWith('Connection is not established');
        });
  
        it('leaveGroup should reject if connection not established', async () => {
          service['connection'] = null as any;
          await expectAsync(service.leaveGroup('g1')).toBeRejectedWith('Connection is not established');
        });
  
        it('deleteGroup should reject if connection not established', async () => {
          service['connection'] = null as any;
          await expectAsync(service.deleteGroup('g1')).toBeRejectedWith('SignalR connection is not established');
        });
  
        it('refreshGroups should early-return when connection not established', () => {
          service['connection'] = null as any;
          const spy = spyOn(service['chatsSubject'], 'next');
          
          service.refreshGroups();
          
          expect(spy).not.toHaveBeenCalled();
        });
  });

  it('handleUserInfoDeletedInGroups should log error when no userName found', () => {
    const badInfo = {};
    (service as any).handleUserInfoDeletedInGroups(badInfo);
  
    expect(console.error).toHaveBeenCalledWith(
      'No valid userName found in userInfo:',
      badInfo
    );
  });
  
  it('addGroupMembers should log error and rethrow on failure', async () => {
    connection.state = signalR.HubConnectionState.Connected;
    const testErr = new Error('add failed');
    connection.invoke.and.returnValue(Promise.reject(testErr));
  
    await expectAsync(
      service.addGroupMembers('g1', { users: ['x'] })
    ).toBeRejectedWith(testErr);
  
    expect(console.error).toHaveBeenCalledWith(
      'Error adding members to group:',
      testErr
    );
  });  
  
  it('removeGroupMembers should log error and rethrow on failure', async () => {
    connection.state = signalR.HubConnectionState.Connected;
    const testErr = new Error('remove failed');
    connection.invoke.and.returnValue(Promise.reject(testErr));
  
    await expectAsync(
      service.removeGroupMembers('g1', { users: ['x'] })
    ).toBeRejectedWith(testErr);
  
    expect(console.error).toHaveBeenCalledWith(
      'Error removing members from group:',
      testErr
    );
  });

  it('refreshGroups should log error on failure', fakeAsync(() => {
    connection.state = signalR.HubConnectionState.Connected;
    const testErr = new Error('refresh failed');
    connection.invoke.and.returnValue(Promise.reject(testErr));
  
    service.refreshGroups();
  
    tick();
  
    expect(console.error).toHaveBeenCalledWith(
      '[GroupChatApiService] Failed to refresh group list:',
      testErr
    );
  }));
   
  it('updateGroupsUserInfo should not change members when nick does not match (covers return member)', () => {
    const originalMember = { nickName: 'anotherUser', image: 'old.png' };
    const group = {
      groupId: 'g1',
      admin: 'admin',
      users: ['u'],
      members: [originalMember]
    } as any;
  
    service['chatsSubject'].next([group]);
  
    const info = { OldNickName: 'oldName', NewUserName: 'newName', UpdatedAt: '' } as any;
    (service as any).updateGroupsUserInfo(info);
  
    expect(service['chatsSubject'].value[0]).toBe(group);
    expect(service['chatsSubject'].value[0].members[0]).toBe(originalMember);
  });

  it('updateGroupsUserInfo should update only nick when Image is not provided', () => {
    const group = {
      groupId: 'g1',
      admin: 'someone',
      users: [],
      members: [{ nickName: 'oldName', image: 'stay.png' }]
    } as any;
    service['chatsSubject'].next([group]);
  
    const info = { OldNickName: 'oldName', NewUserName: 'newName', UpdatedAt: '' } as any;
    (service as any).updateGroupsUserInfo(info);
  
    const updated = service['chatsSubject'].value[0];
    expect(updated.members[0].nickName).toBe('newName');
    expect(updated.members[0].image).toBe('stay.png');
  });
  
  it('EditGroupAsync should emit groupUpdated$', () => {
    service.connected();
    const spy = jasmine.createSpy('groupUpdatedSpy');
    service.groupUpdated$.subscribe(spy);
  
    const base = { groupId: 'g1', admin: 'a' } as any;
    service['chatsSubject'].next([base]);
  
    const updated = { groupId: 'g1', admin: 'b' } as any;
    connection.trigger('EditGroupAsync', updated);
  
    expect(spy).toHaveBeenCalledWith(jasmine.objectContaining(updated));
  });

  it('UserInfoDeleted should handle payload with "UserName" (upper case)', () => {
    service.connected();
    service['chatsSubject'].next([
      { groupId: 'g1', admin: 'badUser', users: ['badUser'], members: [{ nickName: 'badUser' }] } as any
    ]);
  
    connection.trigger('UserInfoDeleted', { UserName: 'badUser' });
  
    const g = service['chatsSubject'].value[0];
    expect(g.admin).toBe('');
    expect(g.users.length).toBe(0);
    expect(g.members.length).toBe(0);
  });

  it('UserInfoDeleted with empty payload should log error (no userName found)', fakeAsync(() => {
    service.connected();
  
    connection.trigger('UserInfoDeleted', {} as any);
    tick();
  
    expect(console.error).toHaveBeenCalledWith(
      'No valid userName found in userInfo:',
      jasmine.any(Object)
    );
  }));

  it('refreshGroups should keep existing groups when server has no matching items', fakeAsync(() => {
    connection.state = signalR.HubConnectionState.Connected;
    const existing = { groupId: 'g1', admin: 'old' } as any;
    service['chatsSubject'].next([existing]);
  
    connection.invoke.and.returnValue(Promise.resolve([{ groupId: 'g2', admin: 'x' }]));
  
    service.refreshGroups();
    tick();
  
    const arr = service['chatsSubject'].value;
    expect(arr.length).toBe(1);
    expect(arr[0]).toBe(existing);
  }));

  describe('disconnect', () => {
    it('should call super.disconnect, reset isConnected and clear registry when connected', () => {
      (service as any).isConnected = true;
      
      const spySuper = spyOn<any>(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'disconnect');
      
      registry.setConnection.calls.reset();
      
      service.disconnect();
      
      expect(spySuper).toHaveBeenCalled();
      expect((service as any).isConnected).toBeFalse();
      expect(registry.setConnection).toHaveBeenCalledWith('groupChat', undefined);
    });
    
    it('should do nothing if isConnected is false', () => {
      (service as any).isConnected = false;
      
      const spySuper = spyOn<any>(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'disconnect');
      
      registry.setConnection.calls.reset();
      
      service.disconnect();
      
      expect(spySuper).not.toHaveBeenCalled();
      expect(registry.setConnection).not.toHaveBeenCalled();
      expect((service as any).isConnected).toBeFalse();
    });
  });
});