import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, skip, throwError } from 'rxjs';
import { GroupUserStateService } from '../group-user-state.service';
import { GroupInfoApiService } from '../../api/group-chat/group-info.api';
import { GroupChatApiService } from '../../api/group-chat/group-chat-hub.api';
import { AuthService } from '../../../../entities/session';
import { GroupMember } from '../group-info.model';

class MockGroupInfoApiService {
  getGroupInfo = jasmine.createSpy('getGroupInfo').and.returnValue(
    of({ success: true, data: { groupName: 'Test Group', image: 'test.jpg', members: [] } })
  );
}

class MockGroupChatApiService {
  groupUpdated$ = new BehaviorSubject<any>(null);
  
  addGroupMembers = jasmine.createSpy('addGroupMembers').and.returnValue(Promise.resolve());
  removeGroupMembers = jasmine.createSpy('removeGroupMembers').and.returnValue(Promise.resolve());
  deleteGroup = jasmine.createSpy('deleteGroup').and.returnValue(Promise.resolve());
  refreshGroups = jasmine.createSpy('refreshGroups');
}

class MockAuthService {
  private authInitSubject = new BehaviorSubject(true);
  
  waitForAuthInit = jasmine.createSpy('waitForAuthInit').and.returnValue(this.authInitSubject.asObservable());
  getNickName = jasmine.createSpy('getNickName').and.returnValue('testUser');
}

describe('GroupUserStateService', () => {
  let service: GroupUserStateService;
  let groupInfoApi: MockGroupInfoApiService;
  let groupChatApi: MockGroupChatApiService;
  let authService: MockAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GroupUserStateService,
        { provide: GroupInfoApiService, useClass: MockGroupInfoApiService },
        { provide: GroupChatApiService, useClass: MockGroupChatApiService },
        { provide: AuthService, useClass: MockAuthService }
      ]
    });

    service = TestBed.inject(GroupUserStateService);
    groupInfoApi = TestBed.inject(GroupInfoApiService) as any;
    groupChatApi = TestBed.inject(GroupChatApiService) as any;
    authService = TestBed.inject(AuthService) as any;
  });

  afterEach(() => {
    groupInfoApi.getGroupInfo.calls.reset();
    groupChatApi.addGroupMembers.calls.reset();
    groupChatApi.removeGroupMembers.calls.reset();
    groupChatApi.deleteGroup.calls.reset();
    groupChatApi.refreshGroups.calls.reset();
    authService.waitForAuthInit.calls.reset();
    authService.getNickName.calls.reset();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize currentUserNickName from authService on auth init', () => {
      expect(authService.waitForAuthInit).toHaveBeenCalled();
      expect(authService.getNickName).toHaveBeenCalled();
      expect(service.getCurrentUserNickName()).toBe('testUser');
    });

    it('should handle empty nickName from authService', () => {
      authService.getNickName.and.returnValue(null);
      
      service = new GroupUserStateService(groupInfoApi as any, groupChatApi as any, authService as any);
      
      expect(service.getCurrentUserNickName()).toBe('');
    });
  });

  describe('Selection Management', () => {
    it('should set selected group with all parameters', () => {
      service.setSelectedGroup('group1', 'Test Group', 'test.jpg');
      
      expect(service.getSelectedGroupId()).toBe('group1');
      expect(service.getSelectedChatName()).toBe('Test Group');
      expect(service.getSelectedChatImage()).toBe('test.jpg');
    });

    it('should load group info when groupId is provided', () => {
      service.setSelectedGroup('group1', 'Test Group', 'test.jpg');
      
      expect(groupInfoApi.getGroupInfo).toHaveBeenCalledWith('group1');
    });

    it('should clear members when groupId is undefined', () => {
      service['membersSubject'].next([{ nickName: 'user1' } as GroupMember]);
      
      service.setSelectedGroup(undefined);
      
      expect(service.getMembers()).toEqual([]);
    });

    it('should clear selection completely', () => {
      service.setSelectedGroup('group1', 'Test Group', 'test.jpg');
      
      service.clearSelection();
      
      expect(service.getSelectedGroupId()).toBeUndefined();
      expect(service.getSelectedChatName()).toBeUndefined();
      expect(service.getSelectedChatImage()).toBeUndefined();
      expect(service.getMembers()).toEqual([]);
    });
  });

  describe('Group Info Loading', () => {
    it('should load group info successfully', () => {
      const mockResponse = {
        success: true,
        data: {
          groupName: 'Updated Group',
          image: 'updated.jpg',
          members: [{ nickName: 'member1' }, { nickName: 'member2' }] as GroupMember[]
        }
      };
      
      groupInfoApi.getGroupInfo.and.returnValue(of(mockResponse));
      
      service.loadGroupInfo('group1');
      
      expect(groupInfoApi.getGroupInfo).toHaveBeenCalledWith('group1');
      expect(service.getSelectedChatName()).toBe('Updated Group');
      expect(service.getSelectedChatImage()).toBe('updated.jpg');
      expect(service.getMembers()).toEqual(mockResponse.data.members);
    });

    it('should handle failed group info loading', () => {
      groupInfoApi.getGroupInfo.and.returnValue(throwError('API Error'));
      
      service.loadGroupInfo('group1');
      
      expect(service.getMembers()).toEqual([]);
    });

    it('should handle unsuccessful API response', () => {
      const mockResponse = { success: false, data: null };
      groupInfoApi.getGroupInfo.and.returnValue(of(mockResponse));
      
      service.loadGroupInfo('group1');

      expect(service.getSelectedChatName()).toBeUndefined();
    });
  });

  describe('Group Management', () => {
    it('should add members successfully', async () => {
      const users = ['user1', 'user2'];
      
      await service.addMembers('group1', users);
      
      expect(groupChatApi.addGroupMembers).toHaveBeenCalledWith('group1', { users });
      expect(groupChatApi.refreshGroups).toHaveBeenCalled();
      expect(groupInfoApi.getGroupInfo).toHaveBeenCalledWith('group1');
    });

    it('should remove member successfully', async () => {
      await service.removeMember('group1', 'user1');
      
      expect(groupChatApi.removeGroupMembers).toHaveBeenCalledWith('group1', { users: ['user1'] });
      expect(groupChatApi.refreshGroups).toHaveBeenCalled();
      expect(groupInfoApi.getGroupInfo).toHaveBeenCalledWith('group1');
    });

    it('should delete group successfully', async () => {
      service.setSelectedGroup('group1', 'Test Group');
      
      await service.deleteGroup('group1');
      
      expect(groupChatApi.deleteGroup).toHaveBeenCalledWith('group1');
      expect(groupChatApi.refreshGroups).toHaveBeenCalled();
      expect(service.getSelectedGroupId()).toBeUndefined();
    });

    it('should handle errors in addMembers', async () => {
      groupChatApi.addGroupMembers.and.returnValue(Promise.reject('Error'));
      
      await expectAsync(service.addMembers('group1', ['user1'])).toBeRejected();
    });

    it('should handle errors in removeMember', async () => {
      groupChatApi.removeGroupMembers.and.returnValue(Promise.reject('Error'));
      
      await expectAsync(service.removeMember('group1', 'user1')).toBeRejected();
    });

    it('should handle errors in deleteGroup', async () => {
      groupChatApi.deleteGroup.and.returnValue(Promise.reject('Error'));
      
      await expectAsync(service.deleteGroup('group1')).toBeRejected();
    });
  });

  describe('Group Updates Subscription', () => {
    it('should update selected group info when groupUpdated$ emits matching group', () => {
      service.setSelectedGroup('group1', 'Old Name', 'old.jpg');
      
      const updatedGroup = {
        groupId: 'group1',
        groupName: 'New Name',
        image: 'new.jpg'
      };
      
      groupChatApi.groupUpdated$.next(updatedGroup);
      
      expect(service.getSelectedChatName()).toBe('New Name');
      expect(service.getSelectedChatImage()).toBe('new.jpg');
    });

    it('should not update when groupUpdated$ emits different group', () => {
      service.setSelectedGroup('group1', 'Test Group', 'test.jpg');
      
      const updatedGroup = {
        groupId: 'group2',
        groupName: 'Other Name',
        image: 'other.jpg'
      };
      
      groupChatApi.groupUpdated$.next(updatedGroup);
      
      expect(service.getSelectedChatName()).toBe('Test Group');
      expect(service.getSelectedChatImage()).toBe('test.jpg');
    });

    it('should not update when no group is selected', () => {
      const updatedGroup = {
        groupId: 'group1',
        groupName: 'New Name',
        image: 'new.jpg'
      };
      
      groupChatApi.groupUpdated$.next(updatedGroup);
      
      expect(service.getSelectedChatName()).toBeUndefined();
      expect(service.getSelectedChatImage()).toBeUndefined();
    });

    it('should handle null/undefined updates gracefully', () => {
      service.setSelectedGroup('group1', 'Test Group', 'test.jpg');
      
      groupChatApi.groupUpdated$.next(null);
      
      expect(service.getSelectedChatName()).toBe('Test Group');
      expect(service.getSelectedChatImage()).toBe('test.jpg');
    });
  });

  describe('Observables', () => {
    it('should emit individual observables', (done) => {
      let emissions = 0;
      const checkComplete = () => {
        emissions++;
        if (emissions === 5) done();
      };
  
      service.selectedGroupId$.pipe(skip(1)).subscribe(id => {
        expect(id).toBe('group1');
        checkComplete();
      });
  
      service.selectedChatName$.pipe(skip(1)).subscribe(name => {
        expect(name).toBe('Test Group');
        checkComplete();
      });
  
      service.selectedChatImage$.pipe(skip(1)).subscribe(image => {
        expect(image).toBe('test.jpg');
        checkComplete();
      });
  
      service.members$.pipe(skip(1)).subscribe(members => {
        expect(members).toEqual([]);
        checkComplete();
      });
  
      service.currentUserNickName$.pipe(skip(1)).subscribe(nickName => {
        expect(nickName).toBe('testUser');
        checkComplete();
      });
  
      service.setSelectedGroup('group1', 'Test Group', 'test.jpg');
    });
  });

  describe('Getter Methods', () => {
    it('should return current values through getter methods', () => {
      const members = [{ nickName: 'member1' }] as GroupMember[];
      
      service.setSelectedGroup('group1', 'Test Group', 'test.jpg');
      service['membersSubject'].next(members);
      
      expect(service.getSelectedGroupId()).toBe('group1');
      expect(service.getSelectedChatName()).toBe('Test Group');
      expect(service.getSelectedChatImage()).toBe('test.jpg');
      expect(service.getMembers()).toEqual(members);
      expect(service.getCurrentUserNickName()).toBe('testUser');
    });
  });

  it('should map combineLatest values to GroupUserState correctly', (done) => {
    const members = [{ nickName: 'member1', image: '' }] as GroupMember[];
  
    groupInfoApi.getGroupInfo.and.returnValue(
      of({ success: true, data: { groupName: 'Test Group', image: 'test.jpg', members } })
    );
  
    service.setSelectedGroup('group1', 'Test Group', 'test.jpg');

    service.userState$.subscribe(state => {
      if (state.members.length) {
        expect(state.selection.selectedGroupId).toBe('group1');
        expect(state.selection.selectedChatName).toBe('Test Group');
        expect(state.selection.selectedChatImage).toBe('test.jpg');
        expect(state.members).toEqual(members);
        expect(state.currentUserNickName).toBe('testUser');
        done();
      }
    });
  });
  
  describe('getGroupMembers', () => {
    it('should return current members array', () => {
      const mockMembers: GroupMember[] = [
        { nickName: 'User1', image: 'image1.png' },
        { nickName: 'User2', image: 'image2.png' }
      ];
      
      service['membersSubject'].next(mockMembers);
      
      const result = service.getGroupMembers();
      
      expect(result).toEqual(mockMembers);
      expect(result.length).toBe(2);
      expect(result[0].nickName).toBe('User1');
    });
  
    it('should return empty array when members is empty', () => {
      service['membersSubject'].next([]);
      
      const result = service.getGroupMembers();
      
      expect(result).toEqual([]);
    });
  
    it('should return empty array when membersSubject value is null', () => {
      service['membersSubject'].next(null as any);
      
      const result = service.getGroupMembers();
      
      expect(result).toEqual([]);
    });
  });
});