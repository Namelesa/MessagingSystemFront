import { TestBed } from '@angular/core/testing';
import { UserStateService, UserDeletionInfo, UserUpdateInfo } from '../user-state.service';
import { OtoChatApiService } from '../../api/oto-chat/oto-chat-hub.api';
import { AuthService } from '../../../../entities/session';
import { of, Subject } from 'rxjs';
import { OtoChat } from '../oto.chat';

describe('UserStateService', () => {
  let service: UserStateService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let chatApiSpy: jasmine.SpyObj<OtoChatApiService>;

  let userInfoDeleted$: Subject<UserDeletionInfo>;
  let userInfoUpdated$: Subject<UserUpdateInfo>;

  beforeEach(() => {
    userInfoDeleted$ = new Subject<UserDeletionInfo>();
    userInfoUpdated$ = new Subject<UserUpdateInfo>();

    chatApiSpy = jasmine.createSpyObj('OtoChatApiService', ['refreshChats'], {
      userInfoDeleted$: userInfoDeleted$,
      userInfoUpdated$: userInfoUpdated$
    });

    authServiceSpy = jasmine.createSpyObj('AuthService', ['waitForAuthInit', 'getNickName']);
    authServiceSpy.waitForAuthInit.and.returnValue(of(true));
    authServiceSpy.getNickName.and.returnValue('currentUser');

    TestBed.configureTestingModule({
      providers: [
        UserStateService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: OtoChatApiService, useValue: chatApiSpy }
      ]
    });

    service = TestBed.inject(UserStateService);
  });

  it('should be created and initialize current user', () => {
    expect(service).toBeTruthy();
    expect(service.getCurrentUserNickName()).toBe('currentUser');
  });

  describe('selected chat setters and getters', () => {
    it('should set and get selected chat', () => {
      const chat: OtoChat = { nickName: 'nick1', image: 'img1' };
      service.setSelectedChat('nick1', 'img1', chat);
      expect(service.getSelectedChat()).toBe('nick1');
      expect(service.getSelectedChatImage()).toBe('img1');
      expect(service.getSelectedOtoChat()).toEqual(chat);
    });

    it('should clear selected chat', () => {
      service.clearSelectedChat();
      expect(service.getSelectedChat()).toBeUndefined();
      expect(service.getSelectedChatImage()).toBeUndefined();
      expect(service.getSelectedOtoChat()).toBeUndefined();
    });
  });

  describe('user deletion notifications', () => {
    it('handleUserDeletion should close chat if matching user', () => {
      service.setSelectedChat('user1');
      const result = service.handleUserDeletion({ userName: 'user1' });
      expect(result.shouldCloseChat).toBeTrue();
      expect(result.shouldShowNotification).toBeTrue();
      expect(service.getSelectedChat()).toBeUndefined();
    });

    it('handleUserDeletion should do nothing if non-matching user', () => {
      service.setSelectedChat('user2');
      const result = service.handleUserDeletion({ userName: 'user1' });
      expect(result.shouldCloseChat).toBeFalse();
      expect(result.shouldShowNotification).toBeFalse();
      expect(service.getSelectedChat()).toBe('user2');
    });
  });

  describe('handleUserInfoUpdate', () => {
    it('should update current user nick', () => {
      service.handleUserInfoUpdate({ userName: 'newUser', oldNickName: 'currentUser', updatedAt: '', image: 'img' });
      expect(service.getCurrentUserNickName()).toBe('newUser');
    });

    it('should update selected chat if matching old nick', () => {
      const chat: OtoChat = { nickName: 'oldChat', image: 'imgOld' };
      service.setSelectedChat('oldChat', 'imgOld', chat);

      const result = service.handleUserInfoUpdate({
        userName: 'newChat',
        oldNickName: 'oldChat',
        updatedAt: '',
        image: 'imgNew'
      });

      expect(result.shouldUpdateSelectedChat).toBeTrue();
      expect(service.getSelectedChat()).toBe('newChat');
      expect(service.getSelectedChatImage()).toBe('imgNew');
      expect(service.getSelectedOtoChat()?.nickName).toBe('newChat');
    });

    it('should do nothing if no matching user', () => {
      const result = service.handleUserInfoUpdate({
        userName: 'other',
        oldNickName: 'someoneElse',
        updatedAt: '',
        image: 'img'
      });
      expect(result.shouldUpdateSelectedChat).toBeFalse();
      expect(result.shouldUpdateCurrentUser).toBeFalse();
    });
  });

  describe('refreshChats', () => {
    it('should call chatApi.refreshChats', () => {
      service.refreshChats();
      expect(chatApiSpy.refreshChats).toHaveBeenCalled();
    });
  });

  describe('display chat helpers', () => {
    it('should detect chat with current user', () => {
      expect(service.isChatWithCurrentUser('currentUser')).toBeTrue();
      expect(service.isChatWithCurrentUser('otherUser')).toBeFalse();
    });

    it('should get display name and image', () => {
      expect(service.getDisplayChatName('currentUser')).toBe('SavedMessage');
      expect(service.getDisplayChatName('other')).toBe('other');

      expect(service.getDisplayChatImage('currentUser', '', 'myImg')).toBe('myImg');
      expect(service.getDisplayChatImage('other', 'imgOther')).toBe('imgOther');
    });
  });

  describe('sortChats', () => {
    it('should sort chats with current user first and by lastUserInfoUpdate', () => {
      const chats: OtoChat[] & any[] = [
        { nickName: 'user1', image: '', lastUserInfoUpdate: '2025-08-18T12:00:00' },
        { nickName: 'currentUser', image: '', lastUserInfoUpdate: '2025-08-18T13:00:00' },
        { nickName: 'user2', image: '', lastUserInfoUpdate: '2025-08-18T14:00:00' }
      ];

      const sorted = service.sortChats(chats);
      expect(sorted[0].nickName).toBe('currentUser');
      expect(sorted[1].nickName).toBe('user2');
      expect(sorted[2].nickName).toBe('user1');
    });
  });

  describe('isChatActive', () => {
    it('should detect active chat', () => {
      service.setSelectedChat('activeChat');
      expect(service.isChatActive('activeChat')).toBeTrue();
      expect(service.isChatActive('other')).toBeFalse();
    });
  });

  describe('UserStateService - observables', () => {
    it('chatState$ should not emit if state did not change (distinctUntilChanged)', done => {
      const emittedStates: any[] = [];
      service.chatState$.subscribe(state => emittedStates.push(state));
  
      service.setSelectedChat(undefined);
  
      setTimeout(() => {
        expect(emittedStates.length).toBe(1);
        done();
      });
    });
  });  
  describe('UserStateService - additional methods', () => {

    it('hideUserDeletedNotification should reset the notification', done => {
      service.showUserDeletedNotification('user1');
  
      service.userDeletedNotification$.subscribe(notification => {
        if (!notification.show) {
          expect(notification).toEqual({ show: false, userName: '' });
          done();
        }
      });
  
      service.hideUserDeletedNotification();
    });
  
    it('subscribeToUserDeletion should call callback on event', done => {
      const callback = jasmine.createSpy('callback');
      service.subscribeToUserDeletion(callback);
  
      userInfoDeleted$.next({ userName: 'deletedUser' });
  
      setTimeout(() => {
        expect(callback).toHaveBeenCalledWith({ userName: 'deletedUser' });
        done();
      });
    });
  
    it('subscribeToUserInfoUpdates should call callback only if userInfo exists', done => {
      const callback = jasmine.createSpy('callback');
      service.subscribeToUserInfoUpdates(callback);
  
      userInfoUpdated$.next(undefined as any);
      expect(callback).not.toHaveBeenCalled();
  
      const update = { userName: 'newUser', oldNickName: 'oldUser', updatedAt: '', image: 'img' };
      userInfoUpdated$.next(update);
  
      setTimeout(() => {
        expect(callback).toHaveBeenCalledWith(update);
        done();
      });
    });
  });
  
  describe('UserStateService - additional coverage', () => {
    it('chatState$ should emit combined state', done => {
      const chat: OtoChat = { nickName: 'nick1', image: 'img1' };
      service.setSelectedChat('nick1', 'img1', chat);
      
      service.chatState$.subscribe(state => {
        expect(state.selectedChat).toBe('nick1');
        expect(state.selectedChatImage).toBe('img1');
        expect(state.selectedOtoChat).toEqual(chat);
        expect(state.currentUserNickName).toBe('currentUser');
        done();
      });
    });
  
    it('displayChatInfo$ should map to displayName and displayImage', done => {
      const chat: OtoChat = { nickName: 'otherUser', image: 'imgOther' };
      service.setSelectedChat('otherUser', 'imgOther', chat);
  
      service.displayChatInfo$.subscribe(info => {
        expect(info.displayName).toBe('otherUser');
        expect(info.displayImage).toBe('imgOther');
        done();
      });
    });
  
    it('displayChatInfo$ should fallback image for current user', done => {
      const chat: OtoChat = { nickName: 'currentUser', image: '' };
      service.setSelectedChat('currentUser', '', chat);
  
      service.displayChatInfo$.subscribe(info => {
        expect(info.displayName).toBe('SavedMessage');
        expect(info.displayImage).toBe('assets/bookmark.svg');
        done();
      });
    });
  
    it('getDisplayChatImage should return fallback if currentUserImage is undefined', () => {
      const result = service.getDisplayChatImage('currentUser', '', undefined);
      expect(result).toBe('assets/bookmark.svg');
    });
  
    it('sortChats should return 0 if lastUserInfoUpdate missing', () => {
      const chats: OtoChat[] & any[] = [
        { nickName: 'user1', image: '' },
        { nickName: 'user2', image: '' }
      ];
      const sorted = service.sortChats(chats);
      expect(sorted.length).toBe(2);
      expect(sorted).toEqual(chats); 
    });
  
    it('ngOnDestroy should unsubscribe and complete subjects', () => {
      const sub1 = jasmine.createSpyObj('sub1', ['unsubscribe']);
      const sub2 = jasmine.createSpyObj('sub2', ['unsubscribe']);
      service['subscriptions'].push(sub1, sub2);
  
      service.ngOnDestroy();
  
      expect(sub1.unsubscribe).toHaveBeenCalled();
      expect(sub2.unsubscribe).toHaveBeenCalled();
      
      expect(() => service.getCurrentUserNickName()).not.toThrow();
    });
  
    it('initializeCurrentUser should set nickname from authService', done => {
      service['initializeCurrentUser']();
      service.currentUserNickName$.subscribe(nick => {
        expect(nick).toBe('currentUser');
        done();
      });
    });
  });  

  describe('UserStateService - fallback branches', () => {  
    it('displayChatInfo$ should fallback displayImage when chat image is empty', done => {
      const chat = { nickName: 'otherUser', image: '' };
      service.setSelectedChat('otherUser', '', chat);
  
      service.displayChatInfo$.subscribe(info => {
        expect(info.displayName).toBe('otherUser');
        expect(info.displayImage).toBe(''); 
        done();
      });
    });
  
    it('initializeCurrentUser sets empty nickName fallback', done => {
      authServiceSpy.getNickName.and.returnValue('');
      service['initializeCurrentUser']();
  
      service.currentUserNickName$.subscribe(nick => {
        expect(nick).toBe(''); 
        done();
      });
    });      
      it('displayChatInfo$ should fallback displayImage when selectedOtoChat.image is empty', done => {
        const chat: OtoChat = { nickName: 'otherUser', image: '' };
        service.setSelectedChat('otherUser', '', chat);
      
        service.displayChatInfo$.subscribe(info => {
          expect(info.displayName).toBe('otherUser'); 
          expect(info.displayImage).toBe('');
          done();
        });
      });      

      it('handleUserInfoUpdate should use userInfo.image if present, else selectedOtoChat.image', () => {
        const chat: OtoChat = { nickName: 'oldChat', image: 'oldImg' };
        service.setSelectedChat('oldChat', 'oldImg', chat);
      
        let result = service.handleUserInfoUpdate({
          userName: 'newChat',
          oldNickName: 'oldChat',
          updatedAt: '',
          image: 'newImg'
        });
      
        expect(service.getSelectedOtoChat()?.image).toBe('newImg');

        service.setSelectedChat('oldChat', 'oldImg', chat);
        result = service.handleUserInfoUpdate({
          userName: 'newChat2',
          oldNickName: 'oldChat',
          updatedAt: '',
          image: undefined
        });
      
        expect(service.getSelectedOtoChat()?.image).toBe('oldImg');
      });      

      it('displayChatInfo$ should fallback displayName and displayImage when selectedOtoChat is undefined', done => {
        service.setSelectedChat(undefined, undefined, undefined);
      
        service.displayChatInfo$.subscribe(info => {
          expect(info.displayName).toBe('');
          done();
        });
      });

      it('displayChatInfo$ should fallback displayImage to empty string for other user when chat image is empty', done => {
        const chat: OtoChat = { nickName: 'otherUser', image: '' };
        service.setSelectedChat('otherUser', '', chat);
      
        service.displayChatInfo$.subscribe(info => {
          expect(info.displayName).toBe('otherUser');
          expect(info.displayImage).toBe(''); 
          done();
        });
      });
  });  
});
