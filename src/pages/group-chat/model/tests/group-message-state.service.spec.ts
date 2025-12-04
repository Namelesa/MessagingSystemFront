import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { GroupMessageStateService, UploadedFile, FileEditData } from '../group-message-state.service';
import { GroupMessagesApiService } from '../../api/group-message/group-messages.api';
import { GroupUserStateService } from '../group-user-state.service';
import { GroupMessage } from '../../../../entities/group-message';

describe('GroupMessageStateService', () => {
  let service: GroupMessageStateService;
  let messagesApiSpy: jasmine.SpyObj<GroupMessagesApiService>;
  let userStateSpy: jasmine.SpyObj<GroupUserStateService>;

  const mockMessage: GroupMessage = {
    id: 'm1',
    content: 'hello',
    groupId: 'g1',
    sender: 'user1',
    sendTime: '2024-01-01',
    isDeleted: false,
    isEdited: false
  };

  const mockMessageWithFiles: GroupMessage = {
    id: 'm2',
    content: JSON.stringify({
      text: 'message with files',
      files: [
        { fileName: 'test.jpg', uniqueFileName: 'unique1.jpg', url: 'http://test.com/test.jpg' }
      ]
    }),
    groupId: 'g1',
    sender: 'user1',
    sendTime: '2024-01-01',
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

    userStateSpy = jasmine.createSpyObj('GroupUserStateService', [
      'getSelectedGroupId',
      'getGroupMembers'
    ]);
    
    userStateSpy.getSelectedGroupId.and.returnValue('g1');
    userStateSpy.getGroupMembers.and.returnValue([
      { nickName: 'user1', image: 'img1.png' },
      { nickName: 'user2', image: 'img2.png' }
    ]);

    TestBed.configureTestingModule({
      providers: [
        GroupMessageStateService,
        { provide: GroupMessagesApiService, useValue: messagesApiSpy },
        { provide: GroupUserStateService, useValue: userStateSpy },
      ]
    });

    service = TestBed.inject(GroupMessageStateService);

    messagesApiSpy.sendMessage.and.returnValue(Promise.resolve({ messageId: 'm1', content: 'hello' }));
    messagesApiSpy.replyToMessage.and.returnValue(Promise.resolve({ messageId: 'm1', content: 'hello' }));
    messagesApiSpy.editMessage.and.returnValue(Promise.resolve());
    messagesApiSpy.deleteMessage.and.returnValue(Promise.resolve());
    messagesApiSpy.softDeleteMessage.and.returnValue(Promise.resolve());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('State Getters', () => {
    it('should return current state', () => {
      expect(service.state).toBeDefined();
      expect(service.state.isDeleteModalOpen).toBeFalse();
    });

    it('should return messageToDelete', () => {
      service.startDeleteMessage(mockMessage);
      expect(service.getMessageToDelete()).toEqual(mockMessage);
    });
  });

  describe('getGroupMemberIds', () => {
    it('should return member nicknames', () => {
      const result = service['getGroupMemberIds']();
      expect(result).toEqual(['user1', 'user2']);
    });

    it('should return empty array and log warning when no members', () => {
      spyOn(console, 'warn');
      userStateSpy.getGroupMembers.and.returnValue([]);
      
      const result = service['getGroupMemberIds']();
      
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith('⚠️ No group members found');
    });

    it('should return empty array and log warning when members is null', () => {
      spyOn(console, 'warn');
      userStateSpy.getGroupMembers.and.returnValue(null as any);
      
      const result = service['getGroupMemberIds']();
      
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith('⚠️ No group members found');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      await service.sendMessage('hello');
      
      expect(messagesApiSpy.sendMessage).toHaveBeenCalledWith('g1', 'hello', ['user1', 'user2']);
    });

    it('should not send if no groupId', async () => {
      userStateSpy.getSelectedGroupId.and.returnValue('');
      await service.sendMessage('hello');
      expect(messagesApiSpy.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send if content is empty', async () => {
      await service.sendMessage('   ');
      expect(messagesApiSpy.sendMessage).not.toHaveBeenCalled();
    });

    it('should reply to message if replyingToMessage is set', async () => {
      service.startReplyToMessage(mockMessage);
      await service.sendMessage('reply content');
      
      expect(messagesApiSpy.replyToMessage).toHaveBeenCalledWith('m1', 'reply content', 'g1', ['user1', 'user2']);
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

    it('should clear replyingToMessage when starting edit', () => {
      service.startReplyToMessage(mockMessage);
      service.startEditMessage(mockMessage);
      
      expect(service.getReplyingToMessage()).toBeUndefined();
    });

    it('should complete edit successfully', async () => {
      await service.completeEdit('m1', 'new content');
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalledWith('m1', 'new content', 'g1', ['user1', 'user2']);
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
      expect(service.getMessageToDelete()).toEqual(mockMessage);
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

    it('should not confirm delete if no messageToDelete', async () => {
      await service.confirmDelete();
      
      expect(messagesApiSpy.deleteMessage).not.toHaveBeenCalled();
      expect(messagesApiSpy.softDeleteMessage).not.toHaveBeenCalled();
    });

    it('should close delete modal', () => {
      service.startDeleteMessage(mockMessage);
      service.setDeleteForBoth(true);
      service.closeDeleteModal();
      
      expect(service.getIsDeleteModalOpen()).toBeFalse();
      expect(service.getDeleteForBoth()).toBeFalse();
      expect(service.getMessageToDelete()).toBeUndefined();
    });

    it('should set deleteForBoth value', () => {
      service.setDeleteForBoth(true);
      expect(service.getDeleteForBoth()).toBeTrue();
      
      service.setDeleteForBoth(false);
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

    it('should clear editingMessage when starting reply', () => {
      service.startEditMessage(mockMessage);
      service.startReplyToMessage(mockMessage);
      
      expect(service.getEditingMessage()).toBeUndefined();
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

  describe('resetAll', () => {
    it('should reset all state', () => {
      service.startDeleteMessage(mockMessage);
      service.setDeleteForBoth(true);

      service.resetAll();

      expect(service.getIsDeleteModalOpen()).toBeFalse();
      expect(service.getDeleteForBoth()).toBeFalse();
      expect(service.state.forceMessageComponentReload).toBeFalse();
    });
  });

  describe('sendMessageWithFiles', () => {
    const mockFiles: UploadedFile[] = [
      { fileName: 'test.jpg', uniqueFileName: 'unique1.jpg', url: 'http://test.com/test.jpg' }
    ];

    it('should send message with files', async () => {
      await service.sendMessageWithFiles('hello', mockFiles);
      
      const expectedContent = JSON.stringify({
        text: 'hello',
        files: mockFiles
      });
      
      expect(messagesApiSpy.sendMessage).toHaveBeenCalledWith('g1', expectedContent, ['user1', 'user2']);
    });

    it('should send message with empty files array as undefined', async () => {
      await service.sendMessageWithFiles('hello', []);
      
      const expectedContent = JSON.stringify({
        text: 'hello',
        files: undefined
      });
      
      expect(messagesApiSpy.sendMessage).toHaveBeenCalledWith('g1', expectedContent, ['user1', 'user2']);
    });

    it('should reply with files if replyingToMessage is set', async () => {
      service.startReplyToMessage(mockMessage);
      await service.sendMessageWithFiles('reply', mockFiles);
      
      const expectedContent = JSON.stringify({
        text: 'reply',
        files: mockFiles
      });
      
      expect(messagesApiSpy.replyToMessage).toHaveBeenCalledWith('m1', expectedContent, 'g1', ['user1', 'user2']);
      expect(service.getReplyingToMessage()).toBeUndefined();
    });

    it('should not send if no groupId', async () => {
      userStateSpy.getSelectedGroupId.and.returnValue('');
      await service.sendMessageWithFiles('hello', mockFiles);
      
      expect(messagesApiSpy.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('completeEditWithFile', () => {
    it('should edit message without file changes', async () => {
      await service.completeEditWithFile('m1', 'new content');
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalledWith('m1', 'new content', 'g1', ['user1', 'user2']);
    });

    it('should not edit if no groupId', async () => {
      userStateSpy.getSelectedGroupId.and.returnValue('');
      await service.completeEditWithFile('m1', 'new content');
      
      expect(messagesApiSpy.editMessage).not.toHaveBeenCalled();
    });

    it('should replace file in content', async () => {
      const oldFile = { uniqueFileName: 'old.jpg', fileName: 'old.jpg', url: 'http://old.com' };
      const newFileData = { uniqueFileName: 'new.jpg', fileName: 'new.jpg', url: 'http://new.com' };
      const fileEditData: FileEditData = { oldFile, newFileData };
      
      const content = JSON.stringify({
        text: 'test',
        files: [oldFile]
      });
      
      await service.completeEditWithFile('m1', content, fileEditData);
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const editedContent = JSON.parse(callArgs[1]);
      expect(editedContent.files[0].uniqueFileName).toBe('new.jpg');
    });

    it('should delete old file if onFileDelete provided', async () => {
      const onFileDelete = jasmine.createSpy('onFileDelete').and.returnValue(Promise.resolve());
      const oldFile = { uniqueFileName: 'old.jpg', fileName: 'old.jpg', url: 'http://old.com' };
      const newFileData = { uniqueFileName: 'new.jpg', fileName: 'new.jpg', url: 'http://new.com' };
      const fileEditData: FileEditData = { oldFile, newFileData };
      
      await service.completeEditWithFile('m1', 'content', fileEditData, onFileDelete);
      
      expect(onFileDelete).toHaveBeenCalledWith('old.jpg');
    });

    it('should handle file delete error gracefully', async () => {
      spyOn(console, 'warn');
      const onFileDelete = jasmine.createSpy('onFileDelete').and.returnValue(Promise.reject('Delete error'));
      const oldFile = { uniqueFileName: 'old.jpg', fileName: 'old.jpg', url: 'http://old.com' };
      const newFileData = { uniqueFileName: 'new.jpg', fileName: 'new.jpg', url: 'http://new.com' };
      const fileEditData: FileEditData = { oldFile, newFileData };
      
      await service.completeEditWithFile('m1', 'content', fileEditData, onFileDelete);
      
      expect(console.warn).toHaveBeenCalledWith('⚠️ Failed to delete old file:', 'Delete error');
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
    });
  });

  describe('addFilesToMessage', () => {
    const newFiles: UploadedFile[] = [
      { fileName: 'new.jpg', uniqueFileName: 'uniqueNew.jpg', url: 'http://new.com/new.jpg' }
    ];
  
    it('should add files to existing message', async () => {
      service.startEditMessage(mockMessageWithFiles);
      await service.addFilesToMessage('m2', newFiles);
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const content = JSON.parse(callArgs[1]);
      expect(content.files.length).toBe(2);
    });
  
    it('should not add files if no groupId', async () => {
      userStateSpy.getSelectedGroupId.and.returnValue('');
      service.startEditMessage(mockMessageWithFiles);
      await service.addFilesToMessage('m2', newFiles);
      
      expect(messagesApiSpy.editMessage).not.toHaveBeenCalled();
    });
  
    it('should not add files if no editingMessage', async () => {
      await service.addFilesToMessage('m2', newFiles);
      
      expect(messagesApiSpy.editMessage).not.toHaveBeenCalled();
    });
  
    it('should handle message without existing files', async () => {
      service.startEditMessage(mockMessage);
      await service.addFilesToMessage('m1', newFiles);
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const content = JSON.parse(callArgs[1]);
      expect(content.files).toEqual(newFiles);
    });
    
    it('should handle editingMessage with empty content', async () => {
      const emptyMessage = { ...mockMessage, content: '' };
      service.startEditMessage(emptyMessage);
      await service.addFilesToMessage('m1', newFiles);
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const content = JSON.parse(callArgs[1]);
      expect(content.text).toBe(''); 
      expect(content.files).toEqual(newFiles);
    });
    
    it('should handle invalid JSON in editingMessage content', async () => {
      const invalidJsonMessage = { ...mockMessage, content: '{invalid json content}' };
      service.startEditMessage(invalidJsonMessage);
      await service.addFilesToMessage('m1', newFiles);
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const content = JSON.parse(callArgs[1]);
      expect(content.text).toBe('{invalid json content}');
      expect(content.files).toEqual(newFiles); 
    });
  
    it('should set files to undefined when allFiles is empty', async () => {
      const messageWithoutFiles = {
        ...mockMessage,
        content: JSON.stringify({ text: 'test message', files: [] })
      };
      service.startEditMessage(messageWithoutFiles);
      await service.addFilesToMessage('m1', []); 
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const content = JSON.parse(callArgs[1]);
      expect(content.files).toBeUndefined();
    });
  
    it('should handle message with null files property', async () => {
      const messageWithNullFiles = {
        ...mockMessage,
        content: JSON.stringify({ text: 'test', files: null })
      };
      service.startEditMessage(messageWithNullFiles);
      await service.addFilesToMessage('m1', newFiles);
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const content = JSON.parse(callArgs[1]);
      expect(content.files).toEqual(newFiles); 
    });
  
    it('should handle message with undefined files property', async () => {
      const messageWithUndefinedFiles = {
        ...mockMessage,
        content: JSON.stringify({ text: 'test' }) 
      };
      service.startEditMessage(messageWithUndefinedFiles);
      await service.addFilesToMessage('m1', newFiles);
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const content = JSON.parse(callArgs[1]);
      expect(content.files).toEqual(newFiles); 
    });
  });

  describe('updateMessageText', () => {
    it('should update text in message with files', async () => {
      service.startEditMessage(mockMessageWithFiles);
      await service.updateMessageText('m2', 'updated text');
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const content = JSON.parse(callArgs[1]);
      expect(content.text).toBe('updated text');
      expect(content.files).toBeDefined();
    });

    it('should update plain text message', async () => {
      service.startEditMessage(mockMessage);
      await service.updateMessageText('m1', 'updated text');
      
      expect(messagesApiSpy.editMessage).toHaveBeenCalled();
      const callArgs = messagesApiSpy.editMessage.calls.mostRecent().args;
      const content = JSON.parse(callArgs[1]);
      expect(content.text).toBe('updated text');
    });

    it('should not update if no groupId', async () => {
      userStateSpy.getSelectedGroupId.and.returnValue('');
      service.startEditMessage(mockMessage);
      await service.updateMessageText('m1', 'updated');
      
      expect(messagesApiSpy.editMessage).not.toHaveBeenCalled();
    });

    it('should not update if no editingMessage', async () => {
      await service.updateMessageText('m1', 'updated');
      
      expect(messagesApiSpy.editMessage).not.toHaveBeenCalled();
    });
  });

  describe('parseMessageContent', () => {
    it('should parse message with JSON content', () => {
      const result = service.parseMessageContent(mockMessageWithFiles);
      
      expect(result.text).toBe('message with files');
      expect(result.files?.length).toBe(1);
      expect((result.files as UploadedFile[])[0].fileName).toBe('test.jpg');
    });

    it('should parse plain text message', () => {
      const result = service.parseMessageContent(mockMessage);
      
      expect(result.text).toBe('hello');
      expect(result.files).toEqual([]);
    });

    it('should handle empty content', () => {
      const emptyMessage = { ...mockMessage, content: '' };
      const result = service.parseMessageContent(emptyMessage);
      
      expect(result.text).toBe('');
      expect(result.files).toEqual([]);
    });
  });

  describe('hasFiles', () => {
    it('should return true for message with files', () => {
      expect(service.hasFiles(mockMessageWithFiles)).toBeTrue();
    });

    it('should return false for message without files', () => {
      expect(service.hasFiles(mockMessage)).toBeFalse();
    });

    it('should return false for invalid JSON', () => {
      const invalidMessage = { ...mockMessage, content: '{invalid json}' };
      expect(service.hasFiles(invalidMessage)).toBeFalse();
    });

    it('should return false for message with empty files array', () => {
      const messageWithEmptyFiles = {
        ...mockMessage,
        content: JSON.stringify({ text: 'test', files: [] })
      };
      expect(service.hasFiles(messageWithEmptyFiles)).toBeFalse();
    });
  });

  describe('getMessageFiles', () => {
    it('should return files from message', () => {
      const files = service.getMessageFiles(mockMessageWithFiles);
      
      expect(files.length).toBe(1);
      expect(files[0].fileName).toBe('test.jpg');
    });

    it('should return empty array for message without files', () => {
      const files = service.getMessageFiles(mockMessage);
      
      expect(files).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      const invalidMessage = { ...mockMessage, content: '{invalid}' };
      const files = service.getMessageFiles(invalidMessage);
      
      expect(files).toEqual([]);
    });
  });

  describe('replaceFileInContent', () => {
    it('should replace existing file', () => {
      const content = JSON.stringify({
        text: 'test',
        files: [{ uniqueFileName: 'old.jpg', fileName: 'old.jpg', url: 'http://old.com' }]
      });
      const oldFile = { uniqueFileName: 'old.jpg' };
      const newFileData = { uniqueFileName: 'new.jpg', fileName: 'new.jpg', url: 'http://new.com' };
      
      const result = service['replaceFileInContent'](content, oldFile, newFileData);
      const parsed = JSON.parse(result);
      
      expect(parsed.files[0].uniqueFileName).toBe('new.jpg');
      expect(parsed.files[0]._forceUpdate).toBeDefined();
      expect(parsed.files[0]._replacementKey).toContain('replacement_');
    });

    it('should handle plain text content', () => {
      const content = 'plain text';
      const oldFile = { uniqueFileName: 'old.jpg' };
      const newFileData = { uniqueFileName: 'new.jpg' };
      
      const result = service['replaceFileInContent'](content, oldFile, newFileData);
      const parsed = JSON.parse(result);
      
      expect(parsed.text).toBe('plain text');
      expect(parsed.files.length).toBe(1);
      expect(parsed.files[0].uniqueFileName).toBe('new.jpg');
    });

    it('should initialize files array if missing', () => {
      const content = JSON.stringify({ text: 'test' });
      const oldFile = { uniqueFileName: 'old.jpg' };
      const newFileData = { uniqueFileName: 'new.jpg' };
      
      const result = service['replaceFileInContent'](content, oldFile, newFileData);
      const parsed = JSON.parse(result);
      
      expect(parsed.files).toBeDefined();
      expect(parsed.files.length).toBe(1);
    });
  });

  describe('parseMessageContent - additional coverage', () => {
    it('should return empty string when parsed.text is null', () => {
      const messageWithNullText = {
        ...mockMessage,
        content: JSON.stringify({ text: null, files: [{ fileName: 'test.jpg' }] })
      };
      const result = service.parseMessageContent(messageWithNullText);
      
      expect(result.text).toBe(''); 
      expect((result.files ?? []).length).toBe(1);
    });
  
    it('should return empty string when parsed.text is undefined', () => {
      const messageWithoutText = {
        ...mockMessage,
        content: JSON.stringify({ files: [{ fileName: 'test.jpg' }] })
      };
      const result = service.parseMessageContent(messageWithoutText);
      
      expect(result.text).toBe(''); 
    });
  
    it('should return empty array when parsed.files is null', () => {
      const messageWithNullFiles = {
        ...mockMessage,
        content: JSON.stringify({ text: 'hello', files: null })
      };
      const result = service.parseMessageContent(messageWithNullFiles);
      
      expect(result.text).toBe('hello');
      expect(result.files).toEqual([]); 
    });
  
    it('should return empty array when parsed.files is undefined', () => {
      const messageWithoutFiles = {
        ...mockMessage,
        content: JSON.stringify({ text: 'hello' })
      };
      const result = service.parseMessageContent(messageWithoutFiles);
      
      expect(result.files).toEqual([]); 
    });
  
    it('should handle null content in catch block', () => {
      const messageWithNullContent = {
        ...mockMessage,
        content: null as any
      };
      const result = service.parseMessageContent(messageWithNullContent);
      
      expect(result.text).toBe(''); 
      expect(result.files).toEqual([]);
    });
  
    it('should handle undefined content in catch block', () => {
      const messageWithUndefinedContent = {
        ...mockMessage,
        content: undefined as any
      };
      const result = service.parseMessageContent(messageWithUndefinedContent);
      
      expect(result.text).toBe(''); 
      expect(result.files).toEqual([]);
    });
  });
  
  describe('getMessageFiles - additional coverage', () => {
    it('should return empty array when parsed.files is null', () => {
      const messageWithNullFiles = {
        ...mockMessage,
        content: JSON.stringify({ text: 'hello', files: null })
      };
      const files = service.getMessageFiles(messageWithNullFiles);
      
      expect(files).toEqual([]);
    });
  
    it('should return empty array when parsed.files is undefined', () => {
      const messageWithoutFiles = {
        ...mockMessage,
        content: JSON.stringify({ text: 'hello' })
      };
      const files = service.getMessageFiles(messageWithoutFiles);
      
      expect(files).toEqual([]);
    });
  
    it('should return empty array when JSON parse fails', () => {
      const invalidMessage = { ...mockMessage, content: '{not valid json' };
      const files = service.getMessageFiles(invalidMessage);
      
      expect(files).toEqual([]); 
    });
  });
  
  describe('findFileIndex - additional coverage for type and url', () => {  
    it('should NOT match by fileName and type when type differs', () => {
      const filesWithType = [
        { fileName: 'file.jpg', type: 'image/jpeg' },
        { fileName: 'file.jpg', type: 'image/png' }
      ];
      const targetFile = { fileName: 'file.jpg', type: 'image/gif' };
      const index = service['findFileIndex'](filesWithType, targetFile);
      
      expect(index).toBe(0);
    });

    it('should return false in fifth strategy when url does not match', () => {
      const files = [
        { uniqueFileName: 'unique1', uniqueId: 'id1', fileName: 'other.jpg', url: 'http://different.com/file.jpg' }
      ];
      const targetFile = { fileName: 'other-name.jpg', url: 'http://target.com/file.jpg' };
      
      const index = service['findFileIndex'](files, targetFile);
      
      expect(index).toBe(-1);
    });
  
    it('should NOT match by url when url is empty string', () => {
      const filesWithEmptyUrl = [
        { fileName: 'file1.jpg', url: '' },
        { fileName: 'file2.jpg', url: 'http://example.com/file2.jpg' }
      ];
      const targetFile = { fileName: 'file1.jpg', url: '' };
      const index = service['findFileIndex'](filesWithEmptyUrl, targetFile);
      
      expect(index).toBe(0);
    });
  
    it('should NOT match by url when url is null', () => {
      const filesWithNullUrl = [
        { fileName: 'file1.jpg', url: null },
        { fileName: 'file2.jpg', url: 'http://example.com/file2.jpg' }
      ];
      const targetFile = { fileName: 'file1.jpg', url: null };
      const index = service['findFileIndex'](filesWithNullUrl, targetFile);
      
      expect(index).toBe(0);
    });
  
    it('should NOT match by url when target url is undefined', () => {
      const filesWithUrls = [
        { fileName: 'file1.jpg', url: 'http://example.com/file1.jpg' },
        { fileName: 'file2.jpg', url: 'http://example.com/file2.jpg' }
      ];
      const targetFile = { fileName: 'file1.jpg', url: undefined };
      const index = service['findFileIndex'](filesWithUrls, targetFile);
      
      expect(index).toBe(0);
    });
  });

  it('should cover return Boolean(f.url) inside fifth strategy', () => {
    const files = [
      { uniqueFileName: 'x', uniqueId: 'y', fileName: 'not-match', url: 'http://test.com/ok.jpg' }
    ];
  
    const targetFile = { url: 'http://test.com/ok.jpg' };
  
    const index = (service as any).findFileIndex(files, targetFile);
  
    expect(index).toBe(0);
  });  

  it('executes third strategy and returns true when fileName and type match (third strategy)', () => {
    const files = [
      { fileName: 'match.jpg', type: 'image/png' }
    ];
  
    const targetFile = { uniqueFileName: 'some-unique', uniqueId: 'some-id', fileName: 'match.jpg', type: 'image/png' };
  
    const index = (service as any).findFileIndex(files, targetFile);
  
    expect(index).toBe(0);
  });  
});