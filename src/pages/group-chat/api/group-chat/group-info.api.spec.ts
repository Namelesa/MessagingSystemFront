import { TestBed } from '@angular/core/testing';
import { GroupInfoApiService } from './group-info.api.js';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { GroupInfoResponse } from '../../model/group-info.model';
import { GroupInfoEditData } from '../../model/group-info-edit.model';
import { environment } from '../../../../shared/api-urls';

describe('GroupInfoApiService', () => {
  let service: GroupInfoApiService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockGroupInfo: GroupInfoResponse = {
    data: {
      admin: 'adminUser',
      members: [{ nickName: 'user1', image: 'img1' }, { nickName: 'user2', image: 'img2' }],
      users: ['user1', 'user2']
    }
  } as any;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GroupInfoApiService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(GroupInfoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getGroupInfo should fetch and update groupInfoSubject', () => {
    service.getGroupInfo('123').subscribe(res => {
      expect(res).toEqual(mockGroupInfo);
    });

    const req = httpMock.expectOne(`${environment.groupApiUrl}123`);
    expect(req.request.method).toBe('GET');
    req.flush(mockGroupInfo);

    expect(service.getCurrentGroupInfo()).toEqual(mockGroupInfo);
  });

  it('updateGroupInfo should send PUT and update subject', () => {
    const editData: GroupInfoEditData = { name: 'New Group' } as any;

    service.updateGroupInfo('123', editData).subscribe(res => {
      expect(res).toEqual(mockGroupInfo);
    });

    const req = httpMock.expectOne(r =>
      r.method === 'PUT' && r.url === `${environment.groupApiUrl}edit-group`
    );
    expect(req.request.params.get('id')).toBe('123');
    req.flush(mockGroupInfo);

    expect(service.getCurrentGroupInfo()).toEqual(mockGroupInfo);
  });

  it('clearGroupInfo should reset state', () => {
    (service as any).groupInfoSubject.next(mockGroupInfo);

    service.clearGroupInfo();

    expect(service.getCurrentGroupInfo()).toBeNull();
    expect((service as any).currentGroupId).toBeNull();
  });

  it('forceRefresh should call refreshGroupInfo if currentGroupId is set', () => {
    spyOn(service, 'refreshGroupInfo').and.returnValue({ subscribe: jasmine.createSpy() } as any);
    (service as any).currentGroupId = '123';

    service.forceRefresh();

    expect(service.refreshGroupInfo).toHaveBeenCalledWith('123');
  });

  describe('handleUserInfoDeleted', () => {
    it('should remove user from admin, members, and users', () => {
      (service as any).groupInfoSubject.next(mockGroupInfo);

      (service as any).handleUserInfoDeleted('adminUser');

      const updated = service.getCurrentGroupInfo();
      expect(updated!.data.admin).toBe('');
      expect(updated!.data.members.length).toBe(2);
    });

    it('should filter user from members and users', () => {
      (service as any).groupInfoSubject.next(mockGroupInfo);

      (service as any).handleUserInfoDeleted('user1');

      const updated = service.getCurrentGroupInfo();
      expect(updated!.data.members.some(m => m.nickName === 'user1')).toBeFalse();
      expect(updated!.data.users.includes('user1')).toBeFalse();
    });
  });

  describe('handleUserInfoChanged', () => {
    it('should update admin when nickname changes', () => {
      (service as any).groupInfoSubject.next(mockGroupInfo);

      (service as any).handleUserInfoChanged({
        OldNickName: 'adminUser',
        NewUserName: 'newAdmin',
        UpdatedAt: 'now'
      });

      expect(service.getCurrentGroupInfo()!.data.admin).toBe('newAdmin');
    });

    it('should update members and users with new nickname and image', () => {
      (service as any).groupInfoSubject.next(mockGroupInfo);

      (service as any).handleUserInfoChanged({
        OldNickName: 'user1',
        NewUserName: 'user1New',
        Image: 'newImg',
        UpdatedAt: 'now'
      });

      const updated = service.getCurrentGroupInfo()!;
      expect(updated.data.members.some(m => m.nickName === 'user1New')).toBeTrue();
      expect(updated.data.members.find(m => m.nickName === 'user1New')!.image).toBe('newImg');
      expect(updated.data.users.includes('user1New')).toBeTrue();
    });
  });

  describe('additional coverage', () => {
    const mockGroupInfo: GroupInfoResponse = {
      data: {
        admin: 'adminUser',
        members: [{ nickName: 'user1', image: 'img1' }, { nickName: 'user2', image: 'img2' }],
        users: ['user1', 'user2']
      }
    } as any;
  
    beforeEach(() => {
      (service as any).groupInfoSubject.next(mockGroupInfo);
    });
  
    it('refreshGroupInfo should call getGroupInfo', () => {
      spyOn(service, 'getGroupInfo').and.callThrough();
      service.refreshGroupInfo('123').subscribe();
      expect(service.getGroupInfo).toHaveBeenCalledWith('123');
    });
  
    it('clearGroupInfo should unsubscribe userInfoSubscription if exists', () => {
      const sub = { unsubscribe: jasmine.createSpy('unsubscribe') };
      (service as any).userInfoSubscription = sub as any;
  
      service.clearGroupInfo();
  
      expect(sub.unsubscribe).toHaveBeenCalled();
      expect((service as any).userInfoSubscription).toBeNull();
    });
  
    it('handleUserInfoChanged should return early if no currentGroupInfo', () => {
      (service as any).groupInfoSubject.next(null);
  
      expect(() =>
        (service as any).handleUserInfoChanged({
          OldNickName: 'x',
          NewUserName: 'y',
          UpdatedAt: 'now'
        })
      ).not.toThrow();
  
      expect(service.getCurrentGroupInfo()).toBeNull();
    });
  
    it('handleUserInfoDeleted should return early if no currentGroupInfo', () => {
      (service as any).groupInfoSubject.next(null);
  
      expect(() => (service as any).handleUserInfoDeleted('user1')).not.toThrow();
    });
  
    it('handleUserInfoDeleted should return early if no userName', () => {
      (service as any).handleUserInfoDeleted('');
  
      const current = service.getCurrentGroupInfo();
      expect(current).toEqual(mockGroupInfo);
    });
  });
  
});
