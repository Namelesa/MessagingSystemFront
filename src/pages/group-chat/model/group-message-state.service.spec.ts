import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { GroupMessageStateService } from './group-message-state.service';
import { GroupMessagesApiService } from '../api/group-message/group-messages.api';
import { GroupUserStateService } from './group-user-state.service';
import { GroupMessage } from '../../../entities/group-message';

describe('GroupMessageStateService', () => {
  let service: GroupMessageStateService;
  let messagesApiSpy: jasmine.SpyObj<GroupMessagesApiService>;
  let userStateSpy: jasmine.SpyObj<GroupUserStateService>;

  const mockMessage: GroupMessage = {
      id: 'm1', content: 'hello', groupId: 'g1',
      sender: '',
      sendTime: '',
      isDeleted: false,
      isEdited: false
  };

  beforeEach(() => {
    messagesApiSpy = jasmine.createSpyObj('GroupMessagesApiService', [
      'sendMessage',
      'replyToMessage',
      'editMessage',
      'deleteMessage',
      'softDeleteMessage'
    ]);

    userStateSpy = jasmine.createSpyObj('GroupUserStateService', ['getSelectedGroupId']);
    userStateSpy.getSelectedGroupId.and.returnValue('g1');

    TestBed.configureTestingModule({
      providers: [
        GroupMessageStateService,
        { provide: GroupMessagesApiService, useValue: messagesApiSpy },
        { provide: GroupUserStateService, useValue: userStateSpy },
      ]
    });

    service = TestBed.inject(GroupMessageStateService);

    messagesApiSpy.sendMessage.and.returnValue(Promise.resolve());
    messagesApiSpy.replyToMessage.and.returnValue(Promise.resolve());
    messagesApiSpy.editMessage.and.returnValue(Promise.resolve());
    messagesApiSpy.deleteMessage.and.returnValue(Promise.resolve());
    messagesApiSpy.softDeleteMessage.and.returnValue(Promise.resolve());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sendMessage', () => {
    it('should not send if no groupId', async () => {
      userStateSpy.getSelectedGroupId.and.returnValue('');
      await service.sendMessage('hello');
      expect(messagesApiSpy.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send if content is empty', async () => {
      await service.sendMessage('   ');
      expect(messagesApiSpy.sendMessage).not.toHaveBeenCalled();
    });

    it('should send normal message', async () => {
      await service.sendMessage('hello');
      expect(messagesApiSpy.sendMessage).toHaveBeenCalledWith('g1', 'hello');
    });

    it('should send reply if replyingToMessage exists', async () => {
      service.startReplyToMessage(mockMessage);
      await service.sendMessage('reply content');
      expect(messagesApiSpy.replyToMessage).toHaveBeenCalledWith('m1', 'reply content', 'g1');
      expect(service.getReplyingToMessage()).toBeUndefined();
    });
  });

  describe('edit message', () => {
    it('should start and cancel edit', () => {
      service.startEditMessage(mockMessage);
      expect(service.getEditingMessage()).toEqual(mockMessage);

      service.cancelEdit();
      expect(service.getEditingMessage()).toBeUndefined();
    });

    it('should complete edit if groupId exists', async () => {
      service.startEditMessage(mockMessage);
      await service.completeEdit('m1', 'new content');
      expect(messagesApiSpy.editMessage).toHaveBeenCalledWith('m1', 'new content', 'g1');
      expect(service.getEditingMessage()).toBeUndefined();
    });

    it('should not complete edit if no groupId', async () => {
      userStateSpy.getSelectedGroupId.and.returnValue('');
      await service.completeEdit('m1', 'new content');
      expect(messagesApiSpy.editMessage).not.toHaveBeenCalled();
    });
  });

  describe('delete message', () => {
    it('should start delete and open modal', () => {
      service.startDeleteMessage(mockMessage);
      expect(service.getIsDeleteModalOpen()).toBeTrue();
    });

    it('should confirm soft delete if deleteForBoth = false', async () => {
      service.startDeleteMessage(mockMessage);
      await service.confirmDelete();
      expect(messagesApiSpy.softDeleteMessage).toHaveBeenCalledWith('m1', 'g1');
      expect(service.getIsDeleteModalOpen()).toBeFalse();
    });

    it('should confirm hard delete if deleteForBoth = true', async () => {
      service.startDeleteMessage(mockMessage);
      service.setDeleteForBoth(true);
      await service.confirmDelete();
      expect(messagesApiSpy.deleteMessage).toHaveBeenCalledWith('m1', 'g1');
      expect(service.getIsDeleteModalOpen()).toBeFalse();
    });

    it('should not confirm delete if no groupId', async () => {
      userStateSpy.getSelectedGroupId.and.returnValue('');
      service.startDeleteMessage(mockMessage);
      await service.confirmDelete();
      expect(messagesApiSpy.deleteMessage).not.toHaveBeenCalled();
      expect(messagesApiSpy.softDeleteMessage).not.toHaveBeenCalled();
    });

    it('should close delete modal', () => {
      service.startDeleteMessage(mockMessage);
      service.closeDeleteModal();
      expect(service.getIsDeleteModalOpen()).toBeFalse();
      expect(service.getDeleteForBoth()).toBeFalse();
    });
  });

  describe('reply', () => {
    it('should start and cancel reply', () => {
      service.startReplyToMessage(mockMessage);
      expect(service.getReplyingToMessage()).toEqual(mockMessage);

      service.cancelReply();
      expect(service.getReplyingToMessage()).toBeUndefined();
    });
  });

  describe('forceMessageComponentReload', () => {
    it('should toggle forceMessageComponentReload true then false', fakeAsync(() => {
      let values: boolean[] = [];
      const sub = service.state$.subscribe(s => values.push(s.forceMessageComponentReload));

      service.forceMessageComponentReload();
      tick(); 

      expect(values).toContain(true);
      expect(values).toContain(false);

      sub.unsubscribe();
    }));
  });

  it('should resetAll state', () => {
    service.startDeleteMessage(mockMessage);
    service.setDeleteForBoth(true);

    service.resetAll();

    expect(service.getIsDeleteModalOpen()).toBeFalse();
    expect(service.getDeleteForBoth()).toBeFalse();
  });
});
