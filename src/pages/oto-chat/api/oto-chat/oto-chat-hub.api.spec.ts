import { TestBed } from '@angular/core/testing';
import { OtoChatApiService } from './oto-chat-hub.api';
import { AuthService } from '../../../../entities/session';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import { OtoMessagesService } from '../oto-message/oto-messages.api';
import { BaseChatApiService } from '../../../../shared/realtime';
import { BehaviorSubject } from 'rxjs';

class BaseChatApiServiceMock<T> {
  public connection = { mocked: true };
  public chatsSubject = new BehaviorSubject<any[]>([]);
  connect = jasmine.createSpy('connect');
  disconnect = jasmine.createSpy('disconnect');
  handleUserInfoChanged = jasmine.createSpy('handleUserInfoChanged');
}

class AuthServiceMock {
  getNickName = jasmine.createSpy().and.returnValue('CurrentUser');
}

class RegistryMock {
  setConnection = jasmine.createSpy('setConnection');
}

class OtoMessagesServiceMock {}

describe('OtoChatApiService', () => {

  let service: OtoChatApiService;
  let registry: RegistryMock;
  let auth: AuthServiceMock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OtoChatApiService,
        { provide: BaseChatApiService, useClass: BaseChatApiServiceMock },
        { provide: AuthService, useClass: AuthServiceMock },
        { provide: SignalRConnectionRegistryService, useClass: RegistryMock },
        { provide: OtoMessagesService, useClass: OtoMessagesServiceMock }
      ]
    });

    service = TestBed.inject(OtoChatApiService);
    registry = TestBed.inject(SignalRConnectionRegistryService) as any;
    auth = TestBed.inject(AuthService) as any;
  });

  it('should connect only once', () => {
    const spyConnect = spyOn<any>(BaseChatApiService.prototype, 'connect');
    
    (service as any).connection = { mocked: true };
  
    service.connected();
    service.connected(); 
  
    expect(spyConnect).toHaveBeenCalledTimes(1);
    expect(registry.setConnection).toHaveBeenCalledTimes(1);
    expect(registry.setConnection).toHaveBeenCalledWith('otoChat', { mocked: true });
  });
  
  it('should disconnect only when connected', () => {
    const spyDisconnect = spyOn<any>(BaseChatApiService.prototype, 'disconnect');
  
    service.connected();
  
    service.disconnect(); 
    service.disconnect(); 
  
    expect(spyDisconnect).toHaveBeenCalledTimes(1);
    expect(registry.setConnection).toHaveBeenCalledWith('otoChat', undefined as any);
  });
  
  it('should call super.handleUserInfoChanged if userInfo is valid', () => {
    const spyHandleUserInfoChanged = spyOn<any>(BaseChatApiService.prototype, 'handleUserInfoChanged');
    const spyGet = spyOn<any>(service, 'getCurrentUser').and.returnValue('User');
  
    const info = {
      NewUserName: 'New',
      OldNickName: 'Old',
      UpdatedAt: '2024',
      Image: 'X'
    };
  
    (service as any).handleUserInfoChanged(info);
  
    expect(spyHandleUserInfoChanged).toHaveBeenCalledWith(info);
    expect(spyGet).toHaveBeenCalled();
  });

  it('should return current nickname', () => {
    const result = (service as any).getCurrentUser();
    expect(auth.getNickName).toHaveBeenCalled();
    expect(result).toBe('CurrentUser');
  });

  it('should log error if userInfo invalid', () => {
    spyOn(console, 'error');

    (service as any).handleUserInfoChanged({ NewUserName: '', OldNickName: '', UpdatedAt: '', Image: '' });

    expect(console.error).toHaveBeenCalled();
  });

  it('should update chat user info when nickname matches', () => {
    const chats = [
      { nickName: 'OldNick', image: 'img1', lastUserInfoUpdate: '' },
      { nickName: 'Other',   image: 'img2', lastUserInfoUpdate: '' }
    ];

    const base = service as any as BaseChatApiServiceMock<any>;
    base.chatsSubject.next(chats);

    const info = {
      OldNickName: 'OldNick',
      NewUserName: 'UpdatedNick',
      Image: 'newImg',
      UpdatedAt: '2024-01-01'
    };

    (service as any).updateChatUserInfo(info);

    const updated = base.chatsSubject.value;

    expect(updated[0].nickName).toBe('UpdatedNick');
    expect(updated[0].image).toBe('newImg');
    expect(updated[0].lastUserInfoUpdate).toBe('2024-01-01');

    expect(updated[1]).toEqual(chats[1]); 
  });

  it('should NOT update chatsSubject when nothing changed', () => {
    const chats = [
      { nickName: 'User', image: 'img' }
    ];

    const base = service as any as BaseChatApiServiceMock<any>;
    base.chatsSubject.next(chats);

    const nextSpy = spyOn(base.chatsSubject, 'next');

    const info = {
      OldNickName: 'AnotherUser',
      NewUserName: 'NewName',
      Image: '',
      UpdatedAt: '2024'
    };

    (service as any).updateChatUserInfo(info);

    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('should keep old image if userInfo.Image is empty', () => {
    const chats = [
      { nickName: 'OldNick', image: 'old-img', lastUserInfoUpdate: '' }
    ];
  
    const base = service as any as BaseChatApiServiceMock<any>;
    base.chatsSubject.next(chats);
  
    const nextSpy = spyOn(base.chatsSubject, 'next').and.callThrough();
  
    const info = {
      OldNickName: 'OldNick',
      NewUserName: 'UpdatedNick',
      Image: '',              
      UpdatedAt: '2025'
    };
  
    (service as any).updateChatUserInfo(info);
  
    expect(nextSpy).toHaveBeenCalled();
  
    const updated = base.chatsSubject.value[0];
  
    expect(updated.nickName).toBe('UpdatedNick');
    expect(updated.image).toBe('old-img');
    expect(updated.lastUserInfoUpdate).toBe('2025');
  });  
});
