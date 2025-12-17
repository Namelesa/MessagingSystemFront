import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { of, BehaviorSubject } from 'rxjs';
import { ChatFacadeService } from '../chat-facade';
import { UserStateService } from '../user-state.service';
import { MessageStateService } from '../message-state.service';
import { UserSearchService } from '../user-search.service';
import { ChatNavigationService } from '../chat-navigation.service';
import { FileEditStateService } from '../../model/file-edit-state-service';
import { MessageCacheService } from '../../model/messages-cache-service';
import { DraftStateService } from '../../model/draft-state-service';
import { FileUploadOperationsService } from '../file-upload-operations.service';
import { OtoChat } from '../oto.chat';
import { OtoMessage } from '../../../../entities/oto-message';

describe('ChatFacadeService', () => {
  let service: ChatFacadeService;
  let userStateService: jasmine.SpyObj<UserStateService>;
  let messageStateService: jasmine.SpyObj<MessageStateService>;
  let userSearchService: jasmine.SpyObj<UserSearchService>;
  let chatNavigationService: jasmine.SpyObj<ChatNavigationService>;
  let fileEditStateService: jasmine.SpyObj<FileEditStateService>;
  let messageCacheService: jasmine.SpyObj<MessageCacheService>;
  let draftStateService: jasmine.SpyObj<DraftStateService>;
  let fileUploadOpsService: jasmine.SpyObj<FileUploadOperationsService>;

  const mockChatState = {
    selectedChat: 'user1',
    selectedChatImage: 'image1.jpg',
    selectedOtoChat: {} as OtoChat,
    currentUserNickName: 'currentUser'
  };

  const mockMessageState = {
    editingMessage: undefined,
    messageToDelete: undefined,
    deleteForBoth: false,
    replyingToMessage: undefined,
    isDeleteModalOpen: false,
    forceMessageComponentReload: false
  };
  
  const mockSearchState = {
    searchQuery: '',
    isSearchActive: false,
    isSearchFocused: false,
    searchResults: []
  };

  const mockDisplayInfo = {
    displayName: 'Test User',
    displayImage: 'test.jpg'
  };

  const mockUserDeletedNotification = {
    show: false,
    userName: ''
  };

  beforeEach(() => {
    const userStateServiceSpy = jasmine.createSpyObj('UserStateService', [
      'subscribeToUserDeletion',
      'subscribeToUserInfoUpdates',
      'handleUserDeletion',
      'handleUserInfoUpdate',
      'refreshChats',
      'getSelectedChat',
      'getSelectedChatImage',
      'getSelectedOtoChat',
      'getCurrentUserNickName',
      'isChatWithCurrentUser',
      'getDisplayChatName',
      'sortChats',
      'isChatActive'
    ], {
      chatState$: new BehaviorSubject(mockChatState),
      displayChatInfo$: new BehaviorSubject(mockDisplayInfo),
      userDeletedNotification$: new BehaviorSubject(mockUserDeletedNotification)
    });

    const messageStateServiceSpy = jasmine.createSpyObj('MessageStateService', [
      'sendMessage',
      'startEditMessage',
      'completeEdit',
      'cancelEdit',
      'startDeleteMessage',
      'confirmDelete',
      'closeDeleteModal',
      'setDeleteForBoth',
      'startReplyToMessage',
      'cancelReply',
      'getCurrentMessageState',
      'resetEditingStates'
    ], {
      messageState$: new BehaviorSubject(mockMessageState)
    });

    const userSearchServiceSpy = jasmine.createSpyObj('UserSearchService', [
      'onSearchQueryChange',
      'onSearchFocus',
      'onSearchActiveChange',
      'clearSearch',
      'onSearchResult',
      'startChatWithUser',
      'getCurrentSearchState'
    ], {
      searchState$: new BehaviorSubject(mockSearchState),
      user$: new BehaviorSubject(null)
    });

    const chatNavigationServiceSpy = jasmine.createSpyObj('ChatNavigationService', [
      'checkForOpenChatUser',
      'handlePendingChatUser',
      'selectChat',
      'selectFoundUser',
      'closeCurrentChat',
      'resetSelectedChat'
    ]);

    const fileEditStateServiceSpy = jasmine.createSpyObj('FileEditStateService', [
      'setEditingOriginalFiles',
      'clearEditingOriginalFiles',
      'addFilesToEditingMessage',
      'replaceFileInMessage',
      'deleteFilesFromMessage',
      'deleteRemovedFilesAfterEdit',
      'deleteReplacedFiles',
      'cleanupTemporaryFiles',
      'updateFileDownloadUrls',
      'resetState'
    ], {
      fileEditState$: new BehaviorSubject({}),
      isEditFileUploading: false,
      editingOriginalFiles: []
    });

    const messageCacheServiceSpy = jasmine.createSpyObj('MessageCacheService', [
      'invalidateMessage',
      'clearAllCaches',
      'clearMessageWithMetadata',
      'forceCompleteMessageUpdate',
      'forceReloadImages',
      'invalidateAndUpdate',
      'getCachedUrl',
      'setCachedUrl',
      'invalidateUrlsByKeys',
      'isUrlExpired',
      'generateFileVersion',
      'enhanceFileWithVersion',
      'generateUniqueFileId',
      'generateRefreshKey',
      'updateEditingMessageFile',
      'updateMessagesArrayWithFile',
      'getTimestamp',
      'generateRandomKey',
      'setMessagesWidget'
    ], {
      messageContentCache: new Map(),
      urlCache: new Map()
    });

    const draftStateServiceSpy = jasmine.createSpyObj('DraftStateService', [
      'getCurrentDraft',
      'setCurrentDraft',
      'clearCurrentDraft',
      'switchToChat',
      'closeCurrentChat',
      'saveDraftForChat',
      'getDraftForChat',
      'deleteDraftForChat',
      'hasDraftForChat',
      'clearAllDrafts',
      'getStatistics'
    ], {
      currentDraft$: new BehaviorSubject('')
    });

    const fileUploadOpsServiceSpy = jasmine.createSpyObj('FileUploadOperationsService', [
      'uploadAndSend',
      'cancelFileUpload',
      'removeFileFromList',
      'closeUploadModal',
      'handleModalFileInput',
      'handleFileDrop',
      'checkUploadSizeLimit'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ChatFacadeService,
        { provide: UserStateService, useValue: userStateServiceSpy },
        { provide: MessageStateService, useValue: messageStateServiceSpy },
        { provide: UserSearchService, useValue: userSearchServiceSpy },
        { provide: ChatNavigationService, useValue: chatNavigationServiceSpy },
        { provide: FileEditStateService, useValue: fileEditStateServiceSpy },
        { provide: MessageCacheService, useValue: messageCacheServiceSpy },
        { provide: DraftStateService, useValue: draftStateServiceSpy },
        { provide: FileUploadOperationsService, useValue: fileUploadOpsServiceSpy }
      ]
    });

    service = TestBed.inject(ChatFacadeService);
    userStateService = TestBed.inject(UserStateService) as jasmine.SpyObj<UserStateService>;
    messageStateService = TestBed.inject(MessageStateService) as jasmine.SpyObj<MessageStateService>;
    userSearchService = TestBed.inject(UserSearchService) as jasmine.SpyObj<UserSearchService>;
    chatNavigationService = TestBed.inject(ChatNavigationService) as jasmine.SpyObj<ChatNavigationService>;
    fileEditStateService = TestBed.inject(FileEditStateService) as jasmine.SpyObj<FileEditStateService>;
    messageCacheService = TestBed.inject(MessageCacheService) as jasmine.SpyObj<MessageCacheService>;
    draftStateService = TestBed.inject(DraftStateService) as jasmine.SpyObj<DraftStateService>;
    fileUploadOpsService = TestBed.inject(FileUploadOperationsService) as jasmine.SpyObj<FileUploadOperationsService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Observables', () => {
    it('should expose chatState$', (done) => {
      service.chatState$.subscribe(state => {
        expect(state).toEqual(mockChatState);
        done();
      });
    });

    it('should combine complete chat state', (done) => {
      service.completeChatState$.subscribe(state => {
        expect(state.chat).toEqual(mockChatState);
        expect(state.messages).toEqual(mockMessageState);
        expect(state.search).toEqual(mockSearchState);
        expect(state.displayInfo).toEqual(mockDisplayInfo);
        expect(state.userDeletedNotification).toEqual(mockUserDeletedNotification);
        done();
      });
    });

    it('should expose displayChatInfo$', (done) => {
      service.displayChatInfo$.subscribe(info => {
        expect(info).toEqual(mockDisplayInfo);
        done();
      });
    });

    it('should expose userDeletedNotification$', (done) => {
      service.userDeletedNotification$.subscribe(notification => {
        expect(notification).toEqual(mockUserDeletedNotification);
        done();
      });
    });

    it('should expose user$', (done) => {
      service.user$.subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });

    it('should expose currentDraft$', (done) => {
      service.currentDraft$.subscribe(draft => {
        expect(draft).toBe('');
        done();
      });
    });
  });

  describe('Chat Navigation Methods', () => {
    it('should initialize chat', () => {
      service.initializeChat();
      expect(chatNavigationService.checkForOpenChatUser).toHaveBeenCalled();
    });

    it('should handle pending chat user without component', () => {
      service.handlePendingChatUser();
      expect(chatNavigationService.handlePendingChatUser).toHaveBeenCalledWith(undefined);
    });

    it('should handle pending chat user with component', () => {
      const mockComponent = {};
      service.handlePendingChatUser(mockComponent);
      expect(chatNavigationService.handlePendingChatUser).toHaveBeenCalledWith(mockComponent);
    });

    it('should select chat', () => {
      const mockChat = {} as OtoChat;
      service.selectChat(mockChat);
      expect(chatNavigationService.selectChat).toHaveBeenCalledWith(mockChat);
    });

    it('should select found user', () => {
      const userData = { nick: 'testuser', image: 'test.jpg' };
      service.selectFoundUser(userData);
      expect(chatNavigationService.selectFoundUser).toHaveBeenCalledWith(userData);
    });

    it('should open chat with user', () => {
      const userData = { nickName: 'testuser', image: 'test.jpg' };
      service.openChatWithUser(userData);
      expect(chatNavigationService.selectFoundUser).toHaveBeenCalledWith({ 
        nick: 'testuser', 
        image: 'test.jpg' 
      });
    });

    it('should close current chat', () => {
      service.closeCurrentChat();
      expect(chatNavigationService.closeCurrentChat).toHaveBeenCalled();
    });

    it('should reset all states', () => {
      service.resetAllStates();
      expect(chatNavigationService.resetSelectedChat).toHaveBeenCalled();
    });
  });

  describe('Message Methods', () => {
    it('should send message', async () => {
      messageStateService.sendMessage.and.returnValue(Promise.resolve());
      await service.sendMessage('test message');
      expect(messageStateService.sendMessage).toHaveBeenCalledWith('test message');
    });

    it('should start edit message', () => {
      const mockMessage = {} as OtoMessage;
      service.startEditMessage(mockMessage);
      expect(messageStateService.startEditMessage).toHaveBeenCalledWith(mockMessage);
    });

    it('should complete edit', async () => {
      messageStateService.completeEdit.and.returnValue(Promise.resolve());
      await service.completeEdit('msg123', 'updated content');
      expect(messageStateService.completeEdit).toHaveBeenCalledWith('msg123', 'updated content');
    });

    it('should cancel edit', () => {
      service.cancelEdit();
      expect(messageStateService.cancelEdit).toHaveBeenCalled();
    });

    it('should start delete message', () => {
      const mockMessage = {} as OtoMessage;
      service.startDeleteMessage(mockMessage);
      expect(messageStateService.startDeleteMessage).toHaveBeenCalledWith(mockMessage);
    });

    it('should confirm delete', async () => {
      messageStateService.confirmDelete.and.returnValue(Promise.resolve());
      await service.confirmDelete();
      expect(messageStateService.confirmDelete).toHaveBeenCalled();
    });

    it('should close delete modal', () => {
      service.closeDeleteModal();
      expect(messageStateService.closeDeleteModal).toHaveBeenCalled();
    });

    it('should set delete for both', () => {
      service.setDeleteForBoth(true);
      expect(messageStateService.setDeleteForBoth).toHaveBeenCalledWith(true);
    });

    it('should start reply to message', () => {
      const mockMessage = {} as OtoMessage;
      service.startReplyToMessage(mockMessage);
      expect(messageStateService.startReplyToMessage).toHaveBeenCalledWith(mockMessage);
    });

    it('should cancel reply', () => {
      service.cancelReply();
      expect(messageStateService.cancelReply).toHaveBeenCalled();
    });

    it('should reset editing states', () => {
      service.resetEditingStates();
      expect(messageStateService.resetEditingStates).toHaveBeenCalled();
    });
  });

  describe('Search Methods', () => {
    it('should handle search query change', () => {
      service.onSearchQueryChange('test query');
      expect(userSearchService.onSearchQueryChange).toHaveBeenCalledWith('test query');
    });

    it('should handle search focus', () => {
      service.onSearchFocus();
      expect(userSearchService.onSearchFocus).toHaveBeenCalled();
    });

    it('should handle search active change', () => {
      service.onSearchActiveChange(true);
      expect(userSearchService.onSearchActiveChange).toHaveBeenCalledWith(true);
    });

    it('should clear search', () => {
      service.clearSearch();
      expect(userSearchService.clearSearch).toHaveBeenCalled();
    });

    it('should handle search result', () => {
      const results = ['user1', 'user2'];
      service.onSearchResult(results);
      expect(userSearchService.onSearchResult).toHaveBeenCalledWith(results);
    });

    it('should start chat with user', () => {
      const userData = { nick: 'testuser', image: 'test.jpg' };
      service.startChatWithUser(userData);
      expect(userSearchService.startChatWithUser).toHaveBeenCalledWith(userData);
    });
  });

  describe('User State Methods', () => {

    it('should handle user deletion', () => {
      const deletedUserInfo = { 
        nickName: 'deletedUser',
        userName: 'Deleted User',
        timestamp: 1234567890 
      };
      const expectedResult = { 
        shouldCloseChat: true,
        shouldShowNotification: true
      };
      userStateService.handleUserDeletion.and.returnValue(expectedResult);
      
      const result = service.handleUserDeletion(deletedUserInfo);
      
      expect(result).toEqual(expectedResult);
      expect(userStateService.handleUserDeletion).toHaveBeenCalledWith(deletedUserInfo);
    });
    
    it('should handle user info update', () => {
      const userInfo = { 
        nickName: 'updatedUser', 
        newImage: 'new-image.jpg',
        newDisplayName: 'New Name',
        userName: 'updatedUser', 
        updatedAt: new Date().toISOString(), 
        oldNickName: 'oldUser'
      };
      userStateService.handleUserInfoUpdate.and.returnValue({ 
        shouldUpdateCurrentUser: false, 
        shouldUpdateSelectedChat: false 
      });
      
      service.handleUserInfoUpdate(userInfo);
      
      expect(userStateService.handleUserInfoUpdate).toHaveBeenCalledWith(userInfo);
    });
    
    it('should get current message state', () => {
      const mockState = {
        editingMessage: undefined,
        messageToDelete: undefined,
        deleteForBoth: false,
        replyingToMessage: undefined,
        isDeleteModalOpen: false,
        forceMessageComponentReload: false
      };
      messageStateService.getCurrentMessageState.and.returnValue(mockState);
      
      const result = service.getCurrentMessageState();
      
      expect(result).toEqual(mockState);
      expect(messageStateService.getCurrentMessageState).toHaveBeenCalled();
    });
    
    it('should get current search state', () => {
      const mockState = {
        searchQuery: 'test query',
        isSearchActive: true,
        isSearchFocused: true,
        searchResults: ['user1', 'user2']
      };
      userSearchService.getCurrentSearchState.and.returnValue(mockState);
      
      const result = service.getCurrentSearchState();
      
      expect(result).toEqual(mockState);
      expect(userSearchService.getCurrentSearchState).toHaveBeenCalled();
    });

    it('should subscribe to user deletion', () => {
      const callback = jasmine.createSpy('callback');
      service.subscribeToUserDeletion(callback);
      expect(userStateService.subscribeToUserDeletion).toHaveBeenCalledWith(callback);
    });

    it('should subscribe to user info updates', () => {
      const callback = jasmine.createSpy('callback');
      service.subscribeToUserInfoUpdates(callback);
      expect(userStateService.subscribeToUserInfoUpdates).toHaveBeenCalledWith(callback);
    });

    it('should refresh chats', () => {
      service.refreshChats();
      expect(userStateService.refreshChats).toHaveBeenCalled();
    });

    it('should get current chat state', () => {
      userStateService.getSelectedChat.and.returnValue('user1');
      userStateService.getSelectedChatImage.and.returnValue('image1.jpg');
      userStateService.getSelectedOtoChat.and.returnValue({} as OtoChat);
      userStateService.getCurrentUserNickName.and.returnValue('currentUser');

      const state = service.getCurrentChatState();
      
      expect(state.selectedChat).toBe('user1');
      expect(state.selectedChatImage).toBe('image1.jpg');
      expect(state.currentUserNickName).toBe('currentUser');
    });

    it('should check if chat is with current user', () => {
      userStateService.isChatWithCurrentUser.and.returnValue(true);
      const result = service.isChatWithCurrentUser('user1');
      expect(result).toBe(true);
      expect(userStateService.isChatWithCurrentUser).toHaveBeenCalledWith('user1');
    });

    it('should get display chat name', () => {
      userStateService.getDisplayChatName.and.returnValue('Test User');
      const name = service.getDisplayChatName('user1');
      expect(name).toBe('Test User');
      expect(userStateService.getDisplayChatName).toHaveBeenCalledWith('user1');
    });

    it('should sort chats', () => {
      const chats = [{} as OtoChat, {} as OtoChat];
      userStateService.sortChats.and.returnValue(chats);
      const sorted = service.sortChats(chats);
      expect(sorted).toEqual(chats);
      expect(userStateService.sortChats).toHaveBeenCalledWith(chats);
    });

    it('should check if chat is active', () => {
      userStateService.isChatActive.and.returnValue(true);
      const result = service.isChatActive('user1');
      expect(result).toBe(true);
      expect(userStateService.isChatActive).toHaveBeenCalledWith('user1');
    });
  });

  describe('File Edit State Methods', () => {
    it('should get isEditFileUploading', () => {
      expect(service.isEditFileUploading).toBe(false);
    });

    it('should get editingOriginalFiles', () => {
      expect(service.editingOriginalFiles).toEqual([]);
    });

    it('should set editing original files', () => {
      const files = [{ name: 'file1.txt' }];
      service.setEditingOriginalFiles(files);
      expect(fileEditStateService.setEditingOriginalFiles).toHaveBeenCalledWith(files);
    });

    it('should clear editing original files', () => {
      service.clearEditingOriginalFiles();
      expect(fileEditStateService.clearEditingOriginalFiles).toHaveBeenCalled();
    });

    it('should add files to editing message', async () => {
      const mockMessage = {} as OtoMessage;
      const files = [new File(['content'], 'test.txt')];
      const expectedResult = {} as OtoMessage;
      
      fileEditStateService.addFilesToEditingMessage.and.returnValue(Promise.resolve(expectedResult));
      
      const result = await service.addFilesToEditingMessage(mockMessage, files, 'message', 'user1');
      
      expect(result).toEqual(expectedResult);
      expect(fileEditStateService.addFilesToEditingMessage).toHaveBeenCalledWith(
        mockMessage, files, 'message', 'user1'
      );
    });

    it('should replace file in message', async () => {
      const oldFile = { name: 'old.txt' };
      const newFile = new File(['new'], 'new.txt');
      const expectedResult = { name: 'new.txt' };
      
      fileEditStateService.replaceFileInMessage.and.returnValue(Promise.resolve(expectedResult));
      
      const result = await service.replaceFileInMessage(oldFile, newFile, 'user1');
      
      expect(result).toEqual(expectedResult);
      expect(fileEditStateService.replaceFileInMessage).toHaveBeenCalledWith(oldFile, newFile, 'user1');
    });

    it('should delete files from message', async () => {
      const mockMessage = {} as OtoMessage;
      const expectedResult = { success: true, failedFiles: [] };
      
      fileEditStateService.deleteFilesFromMessage.and.returnValue(Promise.resolve(expectedResult));
      
      const result = await service.deleteFilesFromMessage(mockMessage, 'user1');
      
      expect(result).toEqual(expectedResult);
      expect(fileEditStateService.deleteFilesFromMessage).toHaveBeenCalledWith(mockMessage, 'user1');
    });

    it('should delete removed files after edit', async () => {
      const originalFiles = [{ name: 'file1.txt' }];
      const finalFiles = [{ name: 'file2.txt' }];
      const expectedResult = { success: true, failedCount: 0 };
      
      fileEditStateService.deleteRemovedFilesAfterEdit.and.returnValue(Promise.resolve(expectedResult));
      
      const result = await service.deleteRemovedFilesAfterEdit(originalFiles, finalFiles, 'user1');
      
      expect(result).toEqual(expectedResult);
      expect(fileEditStateService.deleteRemovedFilesAfterEdit).toHaveBeenCalledWith(
        originalFiles, finalFiles, 'user1'
      );
    });

    it('should delete replaced files', async () => {
      const fileNames = ['file1.txt', 'file2.txt'];
      fileEditStateService.deleteReplacedFiles.and.returnValue(Promise.resolve());
      
      await service.deleteReplacedFiles(fileNames, 'user1');
      
      expect(fileEditStateService.deleteReplacedFiles).toHaveBeenCalledWith(fileNames, 'user1');
    });

    it('should cleanup temporary files', async () => {
      const mockMessage = {} as OtoMessage;
      fileEditStateService.cleanupTemporaryFiles.and.returnValue(Promise.resolve());
      
      await service.cleanupTemporaryFiles(mockMessage, 'user1');
      
      expect(fileEditStateService.cleanupTemporaryFiles).toHaveBeenCalledWith(mockMessage, 'user1');
    });

    it('should update file download urls', async () => {
      const files = [{ name: 'file1.txt' }];
      const expectedResult = [{ name: 'file1.txt', url: 'http://example.com' }];
      
      fileEditStateService.updateFileDownloadUrls.and.returnValue(Promise.resolve(expectedResult));
      
      const result = await service.updateFileDownloadUrls(files, 'user1');
      
      expect(result).toEqual(expectedResult);
      expect(fileEditStateService.updateFileDownloadUrls).toHaveBeenCalledWith(files, 'user1');
    });

    it('should reset file edit state', () => {
      service.resetFileEditState();
      expect(fileEditStateService.resetState).toHaveBeenCalled();
    });
  });

  describe('Message Cache Methods', () => {
    it('should invalidate message cache', () => {
      service.invalidateMessageCache('msg123');
      expect(messageCacheService.invalidateMessage).toHaveBeenCalledWith('msg123');
    });

    it('should clear all message caches', () => {
      service.clearAllMessageCaches();
      expect(messageCacheService.clearAllCaches).toHaveBeenCalled();
    });

    it('should clear message with metadata', () => {
      const mockMessage = {} as OtoMessage;
      service.clearMessageWithMetadata('msg123', mockMessage);
      expect(messageCacheService.clearMessageWithMetadata).toHaveBeenCalledWith('msg123', mockMessage);
    });

    it('should force complete message update without cdr', () => {
      service.forceCompleteMessageUpdate('msg123');
      expect(messageCacheService.forceCompleteMessageUpdate).toHaveBeenCalledWith('msg123', undefined);
    });

    it('should force complete message update with cdr', () => {
      const mockCdr = {} as ChangeDetectorRef;
      service.forceCompleteMessageUpdate('msg123', mockCdr);
      expect(messageCacheService.forceCompleteMessageUpdate).toHaveBeenCalledWith('msg123', mockCdr);
    });

    it('should force reload images', () => {
      service.forceReloadImages('msg123');
      expect(messageCacheService.forceReloadImages).toHaveBeenCalledWith('msg123');
    });

    it('should invalidate and update message without cdr', () => {
      service.invalidateAndUpdateMessage('msg123');
      expect(messageCacheService.invalidateAndUpdate).toHaveBeenCalledWith('msg123', undefined);
    });

    it('should invalidate and update message with cdr', () => {
      const mockCdr = {} as ChangeDetectorRef;
      service.invalidateAndUpdateMessage('msg123', mockCdr);
      expect(messageCacheService.invalidateAndUpdate).toHaveBeenCalledWith('msg123', mockCdr);
    });

    it('should set cached url', () => {
      service.setCachedUrl('key123', 'http://new.url');
      expect(messageCacheService.setCachedUrl).toHaveBeenCalledWith('key123', 'http://new.url');
    });

    it('should invalidate urls by keys', () => {
      const keys = ['key1', 'key2'];
      service.invalidateUrlsByKeys(keys);
      expect(messageCacheService.invalidateUrlsByKeys).toHaveBeenCalledWith(keys);
    });

    it('should check if url is expired', () => {
      messageCacheService.isUrlExpired.and.returnValue(true);
      const result = service.isUrlExpired(12345);
      expect(result).toBe(true);
      expect(messageCacheService.isUrlExpired).toHaveBeenCalledWith(12345);
    });

    it('should generate unique file id', () => {
      messageCacheService.generateUniqueFileId.and.returnValue('file-123');
      const id = service.generateUniqueFileId('test.txt');
      expect(id).toBe('file-123');
      expect(messageCacheService.generateUniqueFileId).toHaveBeenCalledWith('test.txt');
    });

    it('should generate refresh key', () => {
      messageCacheService.generateRefreshKey.and.returnValue('refresh-123');
      const key = service.generateRefreshKey();
      expect(key).toBe('refresh-123');
      expect(messageCacheService.generateRefreshKey).toHaveBeenCalled();
    });

    it('should update editing message file', () => {
      const editingMessage = {} as OtoMessage;
      const oldFile = { name: 'old.txt' };
      const newFileData = { name: 'new.txt' };
      const updated = {} as OtoMessage;
      messageCacheService.updateEditingMessageFile.and.returnValue(updated);
      
      const result = service.updateEditingMessageFile(editingMessage, oldFile, newFileData);
      expect(result).toEqual(updated);
      expect(messageCacheService.updateEditingMessageFile).toHaveBeenCalledWith(
        editingMessage, oldFile, newFileData
      );
    });

    it('should update messages array with file', () => {
      const messages = [{} as OtoMessage];
      const oldFile = { name: 'old.txt' };
      const newFileData = { name: 'new.txt' };
      const updatedMessages = [{} as OtoMessage];
      
      messageCacheService.updateMessagesArrayWithFile.and.returnValue(updatedMessages);
      
      const result = service.updateMessagesArrayWithFile(messages, 'msg123', oldFile, newFileData);
      expect(result).toEqual(updatedMessages);
      expect(messageCacheService.updateMessagesArrayWithFile).toHaveBeenCalledWith(
        messages, 'msg123', oldFile, newFileData
      );
    });

    it('should get message content cache', () => {
      const cache = new Map();
      Object.defineProperty(messageCacheService, 'messageContentCache', { value: cache });
      expect(service.messageContentCache).toBe(cache);
    });

    it('should get url cache', () => {
      const cache = new Map();
      Object.defineProperty(messageCacheService, 'urlCache', { value: cache });
      expect(service.urlCache).toBe(cache);
    });

    it('should get timestamp', () => {
      messageCacheService.getTimestamp.and.returnValue(1234567890);
      const timestamp = service.getTimestamp();
      expect(timestamp).toBe(1234567890);
      expect(messageCacheService.getTimestamp).toHaveBeenCalled();
    });

    it('should get random key', () => {
      messageCacheService.generateRandomKey.and.returnValue('random-key');
      const key = service.getRandomKey();
      expect(key).toBe('random-key');
      expect(messageCacheService.generateRandomKey).toHaveBeenCalled();
    });

    it('should set messages widget', () => {
      const widget = { someProperty: 'value' };
      service.setMessagesWidget(widget);
      expect(messageCacheService.setMessagesWidget).toHaveBeenCalledWith(widget);
    });

    it('should get cached url', () => {
      const mockUrlEntry = { 
        url: 'http://cached.url/file.jpg', 
        timestamp: 1234567890 
      };
      messageCacheService.getCachedUrl.and.returnValue(mockUrlEntry);
      
      const result = service.getCachedUrl('key123');
      
      expect(result).toEqual(mockUrlEntry);
      expect(messageCacheService.getCachedUrl).toHaveBeenCalledWith('key123');
    });
    
    it('should generate file version', () => {
      const options = { fileName: 'test.txt', timestamp: 12345 };
      const mockVersion = { 
        version: 1,
        timestamp: 12345,
        uniqueId: 'file-123',
        refreshKey: 'refresh-key-123',
        forceUpdate: 0,
        typeKey: 'file-type-key'
      };
      messageCacheService.generateFileVersion.and.returnValue(mockVersion);
      
      const result = service.generateFileVersion(options);
      
      expect(result).toEqual(mockVersion);
      expect(messageCacheService.generateFileVersion).toHaveBeenCalledWith(options);
    });
    
    it('should enhance file with version without options', () => {
      const file = { name: 'test.txt', size: 100 };
      const enhancedFile = { ...file, version: 'v1', uniqueId: 'file-123' };
      messageCacheService.enhanceFileWithVersion.and.returnValue(enhancedFile);
      
      const result = service.enhanceFileWithVersion(file);
      
      expect(result).toEqual(enhancedFile);
      expect(messageCacheService.enhanceFileWithVersion).toHaveBeenCalledWith(file, undefined);
    });
    
    it('should enhance file with version with options', () => {
      const file = { name: 'test.txt', size: 100 };
      const options = { 
        replacesFile: 'old-file.txt',
        isTemporary: true,
        isNew: false
      };
      const enhancedFile = { ...file, version: 'v2', uniqueId: 'file-456' };
      messageCacheService.enhanceFileWithVersion.and.returnValue(enhancedFile);
      
      const result = service.enhanceFileWithVersion(file, options);
      
      expect(result).toEqual(enhancedFile);
      expect(messageCacheService.enhanceFileWithVersion).toHaveBeenCalledWith(file, options);
    });
  });

  describe('Draft State Methods', () => {
    it('should get current draft', () => {
      draftStateService.getCurrentDraft.and.returnValue('draft text');
      const draft = service.getCurrentDraft();
      expect(draft).toBe('draft text');
      expect(draftStateService.getCurrentDraft).toHaveBeenCalled();
    });

    it('should set current draft', () => {
      service.setCurrentDraft('new draft');
      expect(draftStateService.setCurrentDraft).toHaveBeenCalledWith('new draft');
    });

    it('should clear current draft', () => {
      service.clearCurrentDraft();
      expect(draftStateService.clearCurrentDraft).toHaveBeenCalled();
    });

    it('should switch to chat draft', () => {
      service.switchToChatDraft('chat123');
      expect(draftStateService.switchToChat).toHaveBeenCalledWith('chat123');
    });

    it('should close current chat draft', () => {
      service.closeCurrentChatDraft();
      expect(draftStateService.closeCurrentChat).toHaveBeenCalled();
    });

    it('should save draft for chat', () => {
      service.saveDraftForChat('chat123', 'draft text');
      expect(draftStateService.saveDraftForChat).toHaveBeenCalledWith('chat123', 'draft text');
    });

    it('should delete draft for chat', () => {
      service.deleteDraftForChat('chat123');
      expect(draftStateService.deleteDraftForChat).toHaveBeenCalledWith('chat123');
    });

    it('should check if has draft for chat', () => {
      draftStateService.hasDraftForChat.and.returnValue(true);
      const result = service.hasDraftForChat('chat123');
      expect(result).toBe(true);
      expect(draftStateService.hasDraftForChat).toHaveBeenCalledWith('chat123');
    });

    it('should clear all drafts', () => {
      service.clearAllDrafts();
      expect(draftStateService.clearAllDrafts).toHaveBeenCalled();
    });

    it('should get draft for chat', () => {
      const mockDraft = { 
        chatId: 'chat123', 
        text: 'saved draft text',
        timestamp: Date.now()
      };
      draftStateService.getDraftForChat.and.returnValue(mockDraft);
      
      const result = service.getDraftForChat('chat123');
      
      expect(result).toEqual(mockDraft);
      expect(draftStateService.getDraftForChat).toHaveBeenCalledWith('chat123');
    });
    
    it('should get drafts statistics', () => {
      const mockStats = { 
        total: 5, 
        totalCharacters: 150,
        oldestTimestamp: 1234567890,
        newestTimestamp: 1234567999
      };
      draftStateService.getStatistics.and.returnValue(mockStats);
      
      const result = service.getDraftsStatistics();
      
      expect(result).toEqual(mockStats);
      expect(draftStateService.getStatistics).toHaveBeenCalled();
    });
  });

  describe('File Upload Operations Methods', () => {
    it('should upload and send files', async () => {
      const expectedResult = { success: true };
      fileUploadOpsService.uploadAndSend.and.returnValue(Promise.resolve(expectedResult));
      
      const result = await service.uploadAndSendFiles('chat123', 'user1');
      
      expect(result).toEqual(expectedResult);
      expect(fileUploadOpsService.uploadAndSend).toHaveBeenCalledWith('chat123', 'user1');
    });

    it('should cancel file upload', () => {
      service.cancelFileUpload(0);
      expect(fileUploadOpsService.cancelFileUpload).toHaveBeenCalledWith(0);
    });

    it('should remove file from list', () => {
      service.removeFileFromList(1);
      expect(fileUploadOpsService.removeFileFromList).toHaveBeenCalledWith(1);
    });

    it('should close upload modal', () => {
      service.closeUploadModal();
      expect(fileUploadOpsService.closeUploadModal).toHaveBeenCalled();
    });

    it('should handle modal file input', () => {
      const mockEvent = new Event('change');
      service.handleModalFileInput(mockEvent);
      expect(fileUploadOpsService.handleModalFileInput).toHaveBeenCalledWith(mockEvent);
    });

    it('should check upload size limit', () => {
      service.checkUploadSizeLimit();
      expect(fileUploadOpsService.checkUploadSizeLimit).toHaveBeenCalled();
    });

    it('should handle file drop', () => {
      const files = [new File(['content'], 'test.txt')];
      const expectedResult = { 
        validFiles: files, 
        hasErrors: false 
      };
      fileUploadOpsService.handleFileDrop.and.returnValue(expectedResult);
      
      const result = service.handleFileDrop(files, 'chat123', 'draft text', false);
      
      expect(result).toEqual(expectedResult);
      expect(fileUploadOpsService.handleFileDrop).toHaveBeenCalledWith(files, 'chat123', 'draft text', false);
    });
  });
});