import { TestBed } from '@angular/core/testing';
import { OtoChatApiService } from './oto-chat-hub.api';
import { AuthService } from '../../../../entities/session';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import { HubConnection } from '@microsoft/signalr';

describe('OtoChatApiService', () => {
  let service: OtoChatApiService;
  let authService: jasmine.SpyObj<AuthService>;
  let registry: jasmine.SpyObj<SignalRConnectionRegistryService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getNickName']);
    registry = jasmine.createSpyObj('SignalRConnectionRegistryService', ['setConnection']);

    TestBed.configureTestingModule({
      providers: [
        OtoChatApiService,
        { provide: AuthService, useValue: authService },
        { provide: SignalRConnectionRegistryService, useValue: registry },
      ],
    });

    service = TestBed.inject(OtoChatApiService);

    (service as any).connection = {
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop').and.returnValue(Promise.resolve())
    } as unknown as HubConnection;

    (service as any).chatsSubject = {
      value: [],
      next: jasmine.createSpy('next')
    } as any;
  });

  it('should create service', () => {
    expect(service).toBeTruthy();
  });

  describe('connected', () => {
    it('should connect and register connection if not connected', () => {
      service.connected();
      expect((service as any).isConnected).toBeTrue();
      expect(registry.setConnection).toHaveBeenCalledWith('otoChat', (service as any).connection);
    });

    it('should not connect if already connected', () => {
      (service as any).isConnected = true;
      service.connected();
      expect(registry.setConnection).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clear registry', async () => {
      (service as any).isConnected = true;

      await service.disconnect();

      expect((service as any).isConnected).toBeFalse();
      expect((service as any).connection.stop).toHaveBeenCalled();
      expect(registry.setConnection).toHaveBeenCalledWith('otoChat', undefined);
    });

    it('should do nothing if not connected', async () => {
      await service.disconnect();
      expect((service as any).connection.stop).not.toHaveBeenCalled();
      expect(registry.setConnection).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return nickname from AuthService', () => {
      authService.getNickName.and.returnValue('Max');
      const nick = (service as any).getCurrentUser();
      expect(nick).toBe('Max');
    });
  });

  describe('handleUserInfoChanged', () => {
    it('should log error if NewUserName or OldNickName missing', () => {
      spyOn(console, 'error');
      (service as any).handleUserInfoChanged({ NewUserName: '', OldNickName: '', UpdatedAt: '123' });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('updateChatUserInfo', () => {
    it('should update chat info and call next if changed', () => {
      (service as any).chatsSubject.value = [{ nickName: 'old', image: 'img', lastUserInfoUpdate: '' }];
      (service as any).updateChatUserInfo({ NewUserName: 'new', OldNickName: 'old', Image: 'img2', UpdatedAt: '123' });
      expect((service as any).chatsSubject.next).toHaveBeenCalledWith([
        { nickName: 'new', image: 'img2', lastUserInfoUpdate: '123' }
      ]);
    });

    it('should not call next if no changes', () => {
      (service as any).chatsSubject.value = [{ nickName: 'same', image: 'img', lastUserInfoUpdate: '' }];
      (service as any).updateChatUserInfo({ NewUserName: 'same', OldNickName: 'same', UpdatedAt: '123' });
      expect((service as any).chatsSubject.next).not.toHaveBeenCalled();
    });
  });

  describe('handleUserInfoChanged', () => {
    it('should log error if NewUserName or OldNickName missing', () => {
      spyOn(console, 'error');
      (service as any).handleUserInfoChanged({ NewUserName: '', OldNickName: '', UpdatedAt: '123' });
      expect(console.error).toHaveBeenCalled();
    });
  
    it('should call super.handleUserInfoChanged and getCurrentUser if data is valid', () => {
      const spySuper = spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'handleUserInfoChanged');
      spyOn(service as any, 'getCurrentUser').and.returnValue('Max');
  
      (service as any).handleUserInfoChanged({
        NewUserName: 'newName',
        OldNickName: 'oldName',
        UpdatedAt: '123',
        Image: 'img'
      });
  
      expect(spySuper).toHaveBeenCalledWith({
        NewUserName: 'newName',
        OldNickName: 'oldName',
        UpdatedAt: '123',
        Image: 'img'
      });
      expect((service as any).getCurrentUser).toHaveBeenCalled();
    });
  });
  
  describe('updateChatUserInfo', () => {
    it('should update chat info and call next if changed', () => {
      (service as any).chatsSubject.value = [{ nickName: 'old', image: 'img', lastUserInfoUpdate: '' }];
      (service as any).updateChatUserInfo({ NewUserName: 'new', OldNickName: 'old', Image: 'img2', UpdatedAt: '123' });
      expect((service as any).chatsSubject.next).toHaveBeenCalledWith([
        { nickName: 'new', image: 'img2', lastUserInfoUpdate: '123' }
      ]);
    });
  
    it('should preserve image if new one is not provided', () => {
      (service as any).chatsSubject.value = [{ nickName: 'old', image: 'keepImg', lastUserInfoUpdate: '' }];
      (service as any).updateChatUserInfo({ NewUserName: 'new', OldNickName: 'old', UpdatedAt: '123' });
      expect((service as any).chatsSubject.next).toHaveBeenCalledWith([
        { nickName: 'new', image: 'keepImg', lastUserInfoUpdate: '123' }
      ]);
    });
  
    it('should not call next if no changes', () => {
      (service as any).chatsSubject.value = [{ nickName: 'same', image: 'img', lastUserInfoUpdate: '' }];
      (service as any).updateChatUserInfo({ NewUserName: 'same', OldNickName: 'same', UpdatedAt: '123' });
      expect((service as any).chatsSubject.next).not.toHaveBeenCalled();
    });

    it('should return chats unchanged if no nick matches OldNickName', () => {
        const originalChats = [{ nickName: 'someone', image: 'img', lastUserInfoUpdate: '' }];
        (service as any).chatsSubject.value = [...originalChats];
      
        (service as any).updateChatUserInfo({
          NewUserName: 'new',
          OldNickName: 'notExisting',
          UpdatedAt: '123'
        });
      
        expect((service as any).chatsSubject.next).not.toHaveBeenCalled();
      
        expect((service as any).chatsSubject.value).toEqual(originalChats);
      });
  });
});
