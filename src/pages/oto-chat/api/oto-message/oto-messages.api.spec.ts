import { TestBed } from '@angular/core/testing';
import { OtoMessagesService } from './oto-messages.api';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import * as signalR from '@microsoft/signalr';

describe('OtoMessagesService', () => {
  let service: OtoMessagesService;
  let registry: jasmine.SpyObj<SignalRConnectionRegistryService>;
  let mockConnection: jasmine.SpyObj<signalR.HubConnection>;

  beforeEach(() => {
    mockConnection = jasmine.createSpyObj('HubConnection', ['invoke'], {
      state: signalR.HubConnectionState.Connected
    });

    registry = jasmine.createSpyObj('SignalRConnectionRegistryService', ['getConnection', 'waitForConnection']);
    registry.getConnection.and.returnValue(mockConnection);
    registry.waitForConnection.and.resolveTo(mockConnection);

    TestBed.configureTestingModule({
      providers: [
        OtoMessagesService,
        { provide: SignalRConnectionRegistryService, useValue: registry }
      ]
    });

    service = TestBed.inject(OtoMessagesService);
  });

  it('should edit message using connected HubConnection', async () => {
    await service.editMessage('msg1', 'New content');
    expect(mockConnection.invoke).toHaveBeenCalledWith('EditMessageAsync', 'msg1', 'New content');
  });

  it('should wait for connection if editing message when no connection', async () => {
    registry.getConnection.and.returnValue(null);

    await service.editMessage('msg1', 'New content');
    expect(registry.waitForConnection).toHaveBeenCalledWith('otoChat', 20, 150);
    expect(mockConnection.invoke).toHaveBeenCalledWith('EditMessageAsync', 'msg1', 'New content');
  });

  it('should throw error when editing message fails', async () => {
    mockConnection.invoke.and.rejectWith('fail');
    await expectAsync(service.editMessage('msg1', 'New content')).toBeRejectedWith('fail');
  });

  it('should delete message using connected HubConnection', async () => {
    await service.deleteMessage('msg1', 'soft');
    expect(mockConnection.invoke).toHaveBeenCalledWith('DeleteMessageAsync', 'msg1', 'soft');
  });

  it('should wait for connection if deleting message when no connection', async () => {
    registry.getConnection.and.returnValue(null);

    await service.deleteMessage('msg1', 'hard');
    expect(registry.waitForConnection).toHaveBeenCalledWith('otoChat', 20, 150);
    expect(mockConnection.invoke).toHaveBeenCalledWith('DeleteMessageAsync', 'msg1', 'hard');
  });

  it('should throw error when deleting message fails', async () => {
    mockConnection.invoke.and.rejectWith('fail');
    await expectAsync(service.deleteMessage('msg1', 'soft')).toBeRejectedWith('fail');
  });

  it('should reply to message using connected HubConnection', async () => {
    await service.replyToMessage('msg1', 'Reply text', 'user1');
    expect(mockConnection.invoke).toHaveBeenCalledWith('ReplyToMessageAsync', 'user1', 'Reply text', 'msg1');
  });

  it('should wait for connection if replying when no connection', async () => {
    registry.getConnection.and.returnValue(null);

    await service.replyToMessage('msg1', 'Reply text', 'user1');
    expect(registry.waitForConnection).toHaveBeenCalledWith('otoChat', 20, 150);
    expect(mockConnection.invoke).toHaveBeenCalledWith('ReplyToMessageAsync', 'user1', 'Reply text', 'msg1');
  });

  it('should throw error when replying to message fails', async () => {
    mockConnection.invoke.and.rejectWith('fail');
    await expectAsync(service.replyToMessage('msg1', 'Reply text', 'user1')).toBeRejectedWith('fail');
  });

  it('should send message using connected HubConnection', async () => {
    await service.sendMessage('user1', 'Hello');
    expect(mockConnection.invoke).toHaveBeenCalledWith('SendMessageAsync', 'user1', 'Hello');
  });
  
  it('should wait for connection if sending message when no connection', async () => {
    registry.getConnection.and.returnValue(null);
  
    await service.sendMessage('user1', 'Hello');
    expect(registry.waitForConnection).toHaveBeenCalledWith('otoChat', 20, 150);
    expect(mockConnection.invoke).toHaveBeenCalledWith('SendMessageAsync', 'user1', 'Hello');
  });
  
  it('should throw error when sending message fails', async () => {
    mockConnection.invoke.and.rejectWith('fail');
    await expectAsync(service.sendMessage('user1', 'Hello')).toBeRejectedWith('fail');
  });  
});
