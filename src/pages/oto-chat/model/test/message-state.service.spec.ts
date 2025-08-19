import { TestBed } from '@angular/core/testing';
import { MessageStateService, MessageState } from '../message-state.service';
import { OtoMessagesService } from '../../api/oto-message/oto-messages.api';
import { UserStateService } from '../user-state.service';
import { OtoMessage } from '../../../../entities/oto-message';

describe('MessageStateService', () => {
  let service: MessageStateService;
  let messageServiceSpy: jasmine.SpyObj<OtoMessagesService>;
  let userStateSpy: jasmine.SpyObj<UserStateService>;

  beforeEach(() => {
    messageServiceSpy = jasmine.createSpyObj('OtoMessagesService', [
      'sendMessage', 'replyToMessage', 'editMessage', 'deleteMessage'
    ]);
    userStateSpy = jasmine.createSpyObj('UserStateService', ['getSelectedChat']);

    TestBed.configureTestingModule({
      providers: [
        MessageStateService,
        { provide: OtoMessagesService, useValue: messageServiceSpy },
        { provide: UserStateService, useValue: userStateSpy }
      ]
    });

    service = TestBed.inject(MessageStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sendMessage', () => {
    it('should not send message if no chat selected', async () => {
      userStateSpy.getSelectedChat.and.returnValue(undefined);
      await service.sendMessage('Hello');
      expect(messageServiceSpy.sendMessage).not.toHaveBeenCalled();
    });

    it('should send a new message if not replying', async () => {
      const chat = { nickName: 'nick', image: 'img' } as any;
      userStateSpy.getSelectedChat.and.returnValue(chat);

      await service.sendMessage('Hello');

      expect(messageServiceSpy.sendMessage).toHaveBeenCalledWith(chat, 'Hello');
    });

    it('should reply to message if replyingToMessage is set', async () => {
      const chat = { nickName: 'nick', image: 'img' } as any;
      const msg: OtoMessage = { messageId: '1', content: 'old' } as any;
      userStateSpy.getSelectedChat.and.returnValue(chat);

      (service as any).updateState({ replyingToMessage: msg });

      await service.sendMessage('Reply');

      expect(messageServiceSpy.replyToMessage).toHaveBeenCalledWith('1', 'Reply', chat);
      expect(service.getCurrentMessageState().replyingToMessage).toBeUndefined();
    });
  });

  describe('editMessage', () => {
    const msg: OtoMessage = { messageId: '1', content: 'old' } as any;

    it('should start editing', () => {
      service.startEditMessage(msg);
      expect(service.getCurrentMessageState().editingMessage).toEqual(msg);
      expect(service.getCurrentMessageState().replyingToMessage).toBeUndefined();
    });

    it('should complete edit and reset editing state', async () => {
      (service as any).updateState({ editingMessage: msg });
      messageServiceSpy.editMessage.and.resolveTo();

      await service.completeEdit('1', 'new');

      expect(messageServiceSpy.editMessage).toHaveBeenCalledWith('1', 'new');
      expect(service.getCurrentMessageState().editingMessage).toBeUndefined();
    });

    it('should cancel editing', () => {
      (service as any).updateState({ editingMessage: msg });
      service.cancelEdit();
      expect(service.getCurrentMessageState().editingMessage).toBeUndefined();
    });
  });

  describe('delete message', () => {
    const msg: OtoMessage = { messageId: '1', content: 'msg' } as any;

    it('should start delete', () => {
      service.startDeleteMessage(msg);
      const state = service.getCurrentMessageState();
      expect(state.messageToDelete).toEqual(msg);
      expect(state.isDeleteModalOpen).toBeTrue();
    });

    it('should confirm delete with soft delete', async () => {
      (service as any).updateState({ messageToDelete: msg, deleteForBoth: false });
      const chat = { nickName: 'nick', image: 'img' } as any;
      userStateSpy.getSelectedChat.and.returnValue(chat);
      messageServiceSpy.deleteMessage.and.resolveTo();

      await service.confirmDelete();

      expect(messageServiceSpy.deleteMessage).toHaveBeenCalledWith('1', 'soft');
      expect(service.getCurrentMessageState().isDeleteModalOpen).toBeFalse();
    });

    it('should confirm delete with hard delete', async () => {
      (service as any).updateState({ messageToDelete: msg, deleteForBoth: true });
      const chat = { nickName: 'nick', image: 'img' } as any;
      userStateSpy.getSelectedChat.and.returnValue(chat);
      messageServiceSpy.deleteMessage.and.resolveTo();

      await service.confirmDelete();

      expect(messageServiceSpy.deleteMessage).toHaveBeenCalledWith('1', 'hard');
    });

    it('should close delete modal', () => {
      service.closeDeleteModal();
      const state = service.getCurrentMessageState();
      expect(state.isDeleteModalOpen).toBeFalse();
      expect(state.messageToDelete).toBeUndefined();
      expect(state.deleteForBoth).toBeFalse();
    });

    it('should set deleteForBoth', () => {
      service.setDeleteForBoth(true);
      expect(service.getCurrentMessageState().deleteForBoth).toBeTrue();
    });
  });

  describe('replying to messages', () => {
    const msg: OtoMessage = { messageId: '1', content: 'msg' } as any;

    it('should start reply', () => {
      service.startReplyToMessage(msg);
      const state = service.getCurrentMessageState();
      expect(state.replyingToMessage).toEqual(msg);
      expect(state.editingMessage).toBeUndefined();
    });

    it('should cancel reply', () => {
      (service as any).updateState({ replyingToMessage: msg });
      service.cancelReply();
      expect(service.getCurrentMessageState().replyingToMessage).toBeUndefined();
    });
  });

  describe('forceMessageComponentReload', () => {
    it('should set forceMessageComponentReload true then false', (done) => {
      service.forceMessageComponentReload();
      const state = service.getCurrentMessageState();
      expect(state.forceMessageComponentReload).toBeTrue();

      queueMicrotask(() => {
        expect(service.getCurrentMessageState().forceMessageComponentReload).toBeFalse();
        done();
      });
    });
  });

  describe('resetAllStates & resetEditingStates', () => {
    const msg: OtoMessage = { messageId: '1', content: 'msg' } as any;

    it('should reset all states', () => {
      (service as any).updateState({ editingMessage: msg, replyingToMessage: msg, messageToDelete: msg, isDeleteModalOpen: true, deleteForBoth: true });
      service.resetAllStates();
      const state = service.getCurrentMessageState();
      expect(state.editingMessage).toBeUndefined();
      expect(state.replyingToMessage).toBeUndefined();
      expect(state.messageToDelete).toBeUndefined();
      expect(state.isDeleteModalOpen).toBeFalse();
      expect(state.deleteForBoth).toBeFalse();
      expect(state.forceMessageComponentReload).toBeFalse();
    });

    it('should reset editing states only', () => {
      (service as any).updateState({ editingMessage: msg, replyingToMessage: msg });
      service.resetEditingStates();
      const state = service.getCurrentMessageState();
      expect(state.editingMessage).toBeUndefined();
      expect(state.replyingToMessage).toBeUndefined();
    });
  });

  describe('error handling', () => {
    let consoleSpy: jasmine.Spy;
  
    beforeEach(() => {
      consoleSpy = spyOn(console, 'error');
    });
  
    it('should log and throw error when sendMessage fails', async () => {
      const chat = { nickName: 'nick', image: 'img' } as any;
      userStateSpy.getSelectedChat.and.returnValue(chat);
      messageServiceSpy.sendMessage.and.rejectWith(new Error('send failed'));
  
      await expectAsync(service.sendMessage('Hello')).toBeRejectedWithError('send failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error sending message:', jasmine.any(Error));
    });
  
    it('should log and throw error when completeEdit fails', async () => {
      const msg: OtoMessage = { messageId: '1', content: 'old' } as any;
      (service as any).updateState({ editingMessage: msg });
      messageServiceSpy.editMessage.and.rejectWith(new Error('edit failed'));
  
      await expectAsync(service.completeEdit('1', 'new')).toBeRejectedWithError('edit failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error editing message:', jasmine.any(Error));
    });
  
    it('should log and throw error when confirmDelete fails', async () => {
      const msg: OtoMessage = { messageId: '1', content: 'msg' } as any;
      (service as any).updateState({ messageToDelete: msg });
      const chat = { nickName: 'nick', image: 'img' } as any;
      userStateSpy.getSelectedChat.and.returnValue(chat);
      messageServiceSpy.deleteMessage.and.rejectWith(new Error('delete failed'));
  
      await expectAsync(service.confirmDelete()).toBeRejectedWithError('delete failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting message:', jasmine.any(Error));
    });
  });  

  describe('confirmDelete early exit', () => {
    it('should return early if no messageToDelete', async () => {
      const chat = { nickName: 'nick', image: 'img' } as any;
      userStateSpy.getSelectedChat.and.returnValue(chat);
      (service as any).updateState({ messageToDelete: undefined });
  
      await service.confirmDelete();
  
      expect(messageServiceSpy.deleteMessage).not.toHaveBeenCalled();
    });
  
    it('should return early if no selected chat', async () => {
      const msg: OtoMessage = { messageId: '1', content: 'msg' } as any;
      userStateSpy.getSelectedChat.and.returnValue(undefined);
      (service as any).updateState({ messageToDelete: msg });
  
      await service.confirmDelete();
  
      expect(messageServiceSpy.deleteMessage).not.toHaveBeenCalled();
    });
  
    it('should return early if both are missing', async () => {
      userStateSpy.getSelectedChat.and.returnValue(undefined);
      (service as any).updateState({ messageToDelete: undefined });
  
      await service.confirmDelete();
  
      expect(messageServiceSpy.deleteMessage).not.toHaveBeenCalled();
    });
  });  
});
