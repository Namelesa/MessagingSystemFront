import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ChatNavigationService } from '../chat-navigation.service';
import { OtoChat } from '../oto.chat';
import { UserStateService } from '../user-state.service';
import { MessageStateService } from '../message-state.service';

describe('ChatNavigationService', () => {
  let service: ChatNavigationService;
  let routerSpy: jasmine.SpyObj<Router>;
  let userStateSpy: jasmine.SpyObj<UserStateService>;
  let messageStateSpy: jasmine.SpyObj<MessageStateService>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['getCurrentNavigation']);
    userStateSpy = jasmine.createSpyObj('UserStateService', [
      'setSelectedChat',
      'clearSelectedChat'
    ]);
    messageStateSpy = jasmine.createSpyObj('MessageStateService', [
      'resetEditingStates',
      'forceMessageComponentReload',
      'resetAllStates'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ChatNavigationService,
        { provide: Router, useValue: routerSpy },
        { provide: UserStateService, useValue: userStateSpy },
        { provide: MessageStateService, useValue: messageStateSpy }
      ]
    });

    service = TestBed.inject(ChatNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkForOpenChatUser', () => {
    it('should set pendingChatUser from router state', () => {
      routerSpy.getCurrentNavigation.and.returnValue({
        extras: { state: { openChatWithUser: { nickName: 'nick1', image: 'img1' } } }
      } as any);

      service.checkForOpenChatUser();

      expect(service.getCurrentNavigationState().pendingChatUser).toEqual({
        nickName: 'nick1',
        image: 'img1'
      });
    });
  });

  describe('handlePendingChatUser', () => {
    it('should call chatListComponent.openChatWithUser if component is provided', () => {
      (service as any).updateState({ pendingChatUser: { nickName: 'nick', image: 'img' } });
      const chatListComponent = jasmine.createSpyObj('ChatListComponent', ['openChatWithUser']);

      service.handlePendingChatUser(chatListComponent);

      expect(chatListComponent.openChatWithUser).toHaveBeenCalledWith({ nick: 'nick', image: 'img' });
      expect(service.getCurrentNavigationState().pendingChatUser).toBeUndefined();
    });

    it('should call selectFoundUser if no component is provided', () => {
      spyOn(service, 'selectFoundUser');

      (service as any).updateState({ pendingChatUser: { nickName: 'nick', image: 'img' } });

      service.handlePendingChatUser();

      expect(service.selectFoundUser).toHaveBeenCalledWith({ nick: 'nick', image: 'img' });
      expect(service.getCurrentNavigationState().pendingChatUser).toBeUndefined();
    });
  });

  describe('selectChat', () => {
    it('should update state and call user/message services', () => {
      const chat: OtoChat = { nickName: 'nick', image: 'img' };

      service.selectChat(chat);

      expect(userStateSpy.setSelectedChat).toHaveBeenCalledWith('nick', 'img', chat);
      expect(messageStateSpy.resetEditingStates).toHaveBeenCalled();
      expect(messageStateSpy.forceMessageComponentReload).toHaveBeenCalled();
      expect(service.getCurrentNavigationState().isNavigating).toBeFalse();
    });
  });

  describe('selectFoundUser', () => {
    it('should call selectChat with mapped user data', () => {
      spyOn(service, 'selectChat');
      service.selectFoundUser({ nick: 'nick', image: 'img' });
      expect(service.selectChat).toHaveBeenCalledWith({ nickName: 'nick', image: 'img' });
    });
  });

  describe('resetSelectedChat', () => {
    it('should call clearSelectedChat and resetAllStates', () => {
      service.resetSelectedChat();
      expect(userStateSpy.clearSelectedChat).toHaveBeenCalled();
      expect(messageStateSpy.resetAllStates).toHaveBeenCalled();
    });
  });

  describe('closeCurrentChat', () => {
    it('should call resetSelectedChat', () => {
      spyOn(service, 'resetSelectedChat');
      service.closeCurrentChat();
      expect(service.resetSelectedChat).toHaveBeenCalled();
    });
  });

  describe('handleChatClosedDueToUserDeletion', () => {
    it('should call resetSelectedChat', () => {
      spyOn(service, 'resetSelectedChat');
      service.handleChatClosedDueToUserDeletion();
      expect(service.resetSelectedChat).toHaveBeenCalled();
    });       
  });

  describe('checkForOpenChatUser', () => {
    let originalHistory: any;
  
    beforeEach(() => {
      originalHistory = window.history;
    });
  
    afterEach(() => {
      Object.defineProperty(window, 'history', { configurable: true, value: originalHistory });
    });
  
    it('should set pendingChatUser from router state', () => {
      routerSpy.getCurrentNavigation.and.returnValue({
        extras: { state: { openChatWithUser: { nickName: 'nick1', image: 'img1' } } }
      } as any);
  
      service.checkForOpenChatUser();
  
      expect(service.getCurrentNavigationState().pendingChatUser).toEqual({
        nickName: 'nick1',
        image: 'img1'
      });
    });
  
    it('should set pendingChatUser from history state if nav state is undefined', () => {
      routerSpy.getCurrentNavigation.and.returnValue(null);
      const historyState = { openChatWithUser: { nickName: 'nick2', image: 'img2' } };
  
      Object.defineProperty(window, 'history', { configurable: true, value: { state: historyState } });
  
      service.checkForOpenChatUser();
  
      expect(service.getCurrentNavigationState().pendingChatUser).toEqual({
        nickName: 'nick2',
        image: 'img2'
      });
    });

    it('should set pendingChatUser from URL query params if nav and history state are undefined', () => {
        routerSpy.getCurrentNavigation.and.returnValue(null);
      
        window.history.pushState({}, '', '/?openChatUser=nick3&openChatImage=img3');
      
        service.checkForOpenChatUser();
      
        expect(service.getCurrentNavigationState().pendingChatUser).toEqual({
          nickName: 'nick3',
          image: 'img3'
        });
      
        window.history.pushState({}, '', '/');
      });        
  });

  it('should not set pendingChatUser if nav, history, and query params are all undefined', () => {
    routerSpy.getCurrentNavigation.and.returnValue(null);
  
    window.history.pushState({}, '', '/');

    service.checkForOpenChatUser();
  
    expect(service.getCurrentNavigationState().pendingChatUser).toBeUndefined();
  });  

  it('should set pendingChatUser from query params with empty image if openChatImage is missing', () => {
    routerSpy.getCurrentNavigation.and.returnValue(null);
  
    window.history.pushState({}, '', '/?openChatUser=nick4'); 
  
    service.checkForOpenChatUser();
  
    expect(service.getCurrentNavigationState().pendingChatUser).toEqual({
      nickName: 'nick4',
      image: ''
    });
  
    window.history.pushState({}, '', '/');
  });  

  describe('checkForOpenChatUser - history.state edge cases', () => {
    let originalHistory: any;
  
    beforeEach(() => {
      originalHistory = window.history;
    });
  
    afterEach(() => {
      Object.defineProperty(window, 'history', { configurable: true, value: originalHistory });
      window.history.pushState({}, '', '/');
    });
  
    it('should not set pendingChatUser if history.state is empty', () => {
      routerSpy.getCurrentNavigation.and.returnValue(null);
      Object.defineProperty(window, 'history', { configurable: true, value: { state: {} } });
  
      service.checkForOpenChatUser();
  
      expect(service.getCurrentNavigationState().pendingChatUser).toBeUndefined();
    });
  
    it('should handle undefined window.history gracefully', () => {
      routerSpy.getCurrentNavigation.and.returnValue(null);
      Object.defineProperty(window, 'history', { configurable: true, value: undefined });
  
      service.checkForOpenChatUser();
  
      expect(service.getCurrentNavigationState().pendingChatUser).toBeUndefined();
    });
  
    it('should use history.state if router state is null and query params are missing', () => {
      routerSpy.getCurrentNavigation.and.returnValue(null);
      const historyState = { openChatWithUser: { nickName: 'nickHistory', image: 'imgHistory' } };
      Object.defineProperty(window, 'history', { configurable: true, value: { state: historyState } });
  
      service.checkForOpenChatUser();
  
      expect(service.getCurrentNavigationState().pendingChatUser).toEqual({
        nickName: 'nickHistory',
        image: 'imgHistory'
      });
    });
  });  
});
