import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { ChatFacadeService } from '../chat-facade';
import { UserStateService, ChatState, UserDeletionInfo, UserUpdateInfo } from '../user-state.service';
import { MessageStateService, MessageState } from '../message-state.service';
import { UserSearchService, UserSearchState } from '../user-search.service';
import { ChatNavigationService } from '../chat-navigation.service';
import { OtoChat } from '../oto.chat';
import { OtoMessage } from '../../../../entities/oto-message';

describe('ChatFacadeService', () => {
  let service: ChatFacadeService;

  let userStateServiceSpy: jasmine.SpyObj<UserStateService>;
  let messageStateServiceSpy: jasmine.SpyObj<MessageStateService>;
  let userSearchServiceSpy: jasmine.SpyObj<UserSearchService>;
  let chatNavigationServiceSpy: jasmine.SpyObj<ChatNavigationService>;

  beforeEach(() => {
    userStateServiceSpy = jasmine.createSpyObj('UserStateService', [
      'getSelectedChat', 'getSelectedChatImage', 'getSelectedOtoChat',
      'getCurrentUserNickName', 'isChatWithCurrentUser', 'getDisplayChatName',
      'sortChats', 'isChatActive', 'subscribeToUserDeletion',
      'subscribeToUserInfoUpdates', 'handleUserDeletion',
      'handleUserInfoUpdate', 'refreshChats'
    ], {
      chatState$: of({ cs: 1 } as unknown as ChatState),
      displayChatInfo$: of({ displayName: 'name', displayImage: 'img' }),
      userDeletedNotification$: of({ show: true, userName: 'bob' })
    });

    messageStateServiceSpy = jasmine.createSpyObj('MessageStateService', [
      'sendMessage', 'startEditMessage', 'completeEdit', 'cancelEdit',
      'startDeleteMessage', 'confirmDelete', 'closeDeleteModal',
      'setDeleteForBoth', 'startReplyToMessage', 'cancelReply',
      'getCurrentMessageState', 'resetEditingStates'
    ], {
      messageState$: of({ ms: 1 } as unknown as MessageState)
    });

    userSearchServiceSpy = jasmine.createSpyObj('UserSearchService', [
      'onSearchQueryChange', 'onSearchFocus', 'onSearchActiveChange',
      'clearSearch', 'onSearchResult', 'startChatWithUser',
      'getCurrentSearchState'
    ], {
      searchState$: of({ ss: 1 } as unknown as UserSearchState),
      user$: of('testUser')
    });

    chatNavigationServiceSpy = jasmine.createSpyObj('ChatNavigationService', [
      'checkForOpenChatUser', 'handlePendingChatUser', 'selectChat',
      'selectFoundUser', 'closeCurrentChat', 'resetSelectedChat'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ChatFacadeService,
        { provide: UserStateService, useValue: userStateServiceSpy },
        { provide: MessageStateService, useValue: messageStateServiceSpy },
        { provide: UserSearchService, useValue: userSearchServiceSpy },
        { provide: ChatNavigationService, useValue: chatNavigationServiceSpy }
      ]
    });

    service = TestBed.inject(ChatFacadeService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('initializeChat calls checkForOpenChatUser', () => {
    service.initializeChat();
    expect(chatNavigationServiceSpy.checkForOpenChatUser).toHaveBeenCalled();
  });

  it('handlePendingChatUser calls handlePendingChatUser', () => {
    const cmpRef = { any: true };
    service.handlePendingChatUser(cmpRef);
    expect(chatNavigationServiceSpy.handlePendingChatUser).toHaveBeenCalledWith(cmpRef);
  });

  it('selectChat calls selectChat', () => {
    const chat = {} as OtoChat;
    service.selectChat(chat);
    expect(chatNavigationServiceSpy.selectChat).toHaveBeenCalledWith(chat);
  });

  it('selectFoundUser calls selectFoundUser', () => {
    const u = { nick: 'nick', image: 'img' };
    service.selectFoundUser(u);
    expect(chatNavigationServiceSpy.selectFoundUser).toHaveBeenCalledWith(u);
  });

  it('openChatWithUser maps {nickName,image} to {nick,image} and calls selectFoundUser', () => {
    service.openChatWithUser({ nickName: 'john', image: 'x' });
    expect(chatNavigationServiceSpy.selectFoundUser).toHaveBeenCalledWith({ nick: 'john', image: 'x' });
  });

  it('closeCurrentChat calls closeCurrentChat', () => {
    service.closeCurrentChat();
    expect(chatNavigationServiceSpy.closeCurrentChat).toHaveBeenCalled();
  });

  it('sendMessage calls messageStateService.sendMessage', async () => {
    messageStateServiceSpy.sendMessage.and.resolveTo();
    await service.sendMessage('hi');
    expect(messageStateServiceSpy.sendMessage).toHaveBeenCalledWith('hi');
  });

  it('startEditMessage calls startEditMessage', () => {
    const m = {} as OtoMessage;
    service.startEditMessage(m);
    expect(messageStateServiceSpy.startEditMessage).toHaveBeenCalledWith(m);
  });

  it('completeEdit calls completeEdit', async () => {
    messageStateServiceSpy.completeEdit.and.resolveTo();
    await service.completeEdit('id', 'txt');
    expect(messageStateServiceSpy.completeEdit).toHaveBeenCalledWith('id', 'txt');
  });

  it('cancelEdit calls cancelEdit', () => {
    service.cancelEdit();
    expect(messageStateServiceSpy.cancelEdit).toHaveBeenCalled();
  });

  it('startDeleteMessage calls startDeleteMessage', () => {
    const m = {} as OtoMessage;
    service.startDeleteMessage(m);
    expect(messageStateServiceSpy.startDeleteMessage).toHaveBeenCalledWith(m);
  });

  it('confirmDelete calls confirmDelete', async () => {
    messageStateServiceSpy.confirmDelete.and.resolveTo();
    await service.confirmDelete();
    expect(messageStateServiceSpy.confirmDelete).toHaveBeenCalled();
  });

  it('closeDeleteModal calls closeDeleteModal', () => {
    service.closeDeleteModal();
    expect(messageStateServiceSpy.closeDeleteModal).toHaveBeenCalled();
  });

  it('setDeleteForBoth calls setDeleteForBoth', () => {
    service.setDeleteForBoth(true);
    expect(messageStateServiceSpy.setDeleteForBoth).toHaveBeenCalledWith(true);
  });

  it('startReplyToMessage calls startReplyToMessage', () => {
    const m = {} as OtoMessage;
    service.startReplyToMessage(m);
    expect(messageStateServiceSpy.startReplyToMessage).toHaveBeenCalledWith(m);
  });

  it('cancelReply calls cancelReply', () => {
    service.cancelReply();
    expect(messageStateServiceSpy.cancelReply).toHaveBeenCalled();
  });

  it('onSearchQueryChange calls onSearchQueryChange', () => {
    service.onSearchQueryChange('q');
    expect(userSearchServiceSpy.onSearchQueryChange).toHaveBeenCalledWith('q');
  });

  it('onSearchFocus calls onSearchFocus', () => {
    service.onSearchFocus();
    expect(userSearchServiceSpy.onSearchFocus).toHaveBeenCalled();
  });

  it('onSearchActiveChange calls onSearchActiveChange', () => {
    service.onSearchActiveChange(true);
    expect(userSearchServiceSpy.onSearchActiveChange).toHaveBeenCalledWith(true);
  });

  it('clearSearch calls clearSearch', () => {
    service.clearSearch();
    expect(userSearchServiceSpy.clearSearch).toHaveBeenCalled();
  });

  it('onSearchResult calls onSearchResult', () => {
    const res = ['a', 'b'];
    service.onSearchResult(res);
    expect(userSearchServiceSpy.onSearchResult).toHaveBeenCalledWith(res);
  });

  it('startChatWithUser calls startChatWithUser', () => {
    const u = { nick: 'n', image: 'i' };
    service.startChatWithUser(u);
    expect(userSearchServiceSpy.startChatWithUser).toHaveBeenCalledWith(u);
  });

  it('subscribeToUserDeletion proxies return value', () => {
    const ret = { unsub: () => {} } as any;
    userStateServiceSpy.subscribeToUserDeletion.and.returnValue(ret);
    const cb = (() => {}) as (i: UserDeletionInfo) => void;
    const got = service.subscribeToUserDeletion(cb);
    expect(userStateServiceSpy.subscribeToUserDeletion).toHaveBeenCalledWith(cb);
    expect(got).toBe(ret);
  });

  it('subscribeToUserInfoUpdates proxies return value', () => {
    const ret = { unsub: () => {} } as any;
    userStateServiceSpy.subscribeToUserInfoUpdates.and.returnValue(ret);
    const cb = (() => {}) as (i: UserUpdateInfo) => void;
    const got = service.subscribeToUserInfoUpdates(cb);
    expect(userStateServiceSpy.subscribeToUserInfoUpdates).toHaveBeenCalledWith(cb);
    expect(got).toBe(ret);
  });

  it('handleUserDeletion calls handleUserDeletion', () => {
    const info = { userName: 'x' } as unknown as UserDeletionInfo;
    service.handleUserDeletion(info);
    expect(userStateServiceSpy.handleUserDeletion).toHaveBeenCalledWith(info);
  });

  it('handleUserInfoUpdate calls handleUserInfoUpdate', () => {
    const info = { NewUserName: 'n' } as unknown as UserUpdateInfo;
    service.handleUserInfoUpdate(info);
    expect(userStateServiceSpy.handleUserInfoUpdate).toHaveBeenCalledWith(info);
  });

  it('refreshChats calls refreshChats', () => {
    service.refreshChats();
    expect(userStateServiceSpy.refreshChats).toHaveBeenCalled();
  });

  it('getCurrentChatState builds structure from UserStateService', () => {
    const chatObj = { id: 1 } as unknown as OtoChat;
    userStateServiceSpy.getSelectedChat.and.returnValue('chat');
    userStateServiceSpy.getSelectedChatImage.and.returnValue('img');
    userStateServiceSpy.getSelectedOtoChat.and.returnValue(chatObj);
    userStateServiceSpy.getCurrentUserNickName.and.returnValue('me');

    const s = service.getCurrentChatState();
    expect(s).toEqual({
      selectedChat: 'chat',
      selectedChatImage: 'img',
      selectedOtoChat: chatObj,
      currentUserNickName: 'me'
    });
  });

  it('getCurrentMessageState proxies', () => {
    const ms = { editingMessageId: '42' } as unknown as MessageState;
    messageStateServiceSpy.getCurrentMessageState.and.returnValue(ms);
    expect(service.getCurrentMessageState()).toBe(ms);
  });

  it('getCurrentSearchState proxies', () => {
    const ss = { query: 'q' } as unknown as UserSearchState;
    userSearchServiceSpy.getCurrentSearchState.and.returnValue(ss);
    expect(service.getCurrentSearchState()).toBe(ss);
  });

  it('isChatWithCurrentUser proxies boolean', () => {
    userStateServiceSpy.isChatWithCurrentUser.and.returnValue(true);
    expect(service.isChatWithCurrentUser('nick')).toBeTrue();
  });

  it('getDisplayChatName proxies string', () => {
    userStateServiceSpy.getDisplayChatName.and.returnValue('Pretty');
    expect(service.getDisplayChatName('n')).toBe('Pretty');
  });

  it('sortChats proxies array', () => {
    const arr = [{ id: 1 } as unknown as OtoChat];
    const out = [{ id: 2 } as unknown as OtoChat];
    userStateServiceSpy.sortChats.and.returnValue(out);
    expect(service.sortChats(arr)).toBe(out);
    expect(userStateServiceSpy.sortChats).toHaveBeenCalledWith(arr);
  });

  it('isChatActive proxies boolean', () => {
    userStateServiceSpy.isChatActive.and.returnValue(false);
    expect(service.isChatActive('nick')).toBeFalse();
  });

  it('completeChatState$ combines all sources', async () => {
    const result = await firstValueFrom(service.completeChatState$);
    expect(result).toEqual({
      chat: { cs: 1 } as any,
      messages: { ms: 1 } as any,
      search: { ss: 1 } as any,
      displayInfo: { displayName: 'name', displayImage: 'img' },
      userDeletedNotification: { show: true, userName: 'bob' }
    });
  });

  it('exposes chatState$, messageState$, searchState$, displayChatInfo$, userDeletedNotification$, user$', async () => {
    expect(await firstValueFrom(service.chatState$)).toEqual({ cs: 1 } as any);
    expect(await firstValueFrom(service.messageState$)).toEqual({ ms: 1 } as any);
    expect(await firstValueFrom(service.searchState$)).toEqual({ ss: 1 } as any);
    expect(await firstValueFrom(service.displayChatInfo$)).toEqual({ displayName: 'name', displayImage: 'img' });
    expect(await firstValueFrom(service.userDeletedNotification$)).toEqual({ show: true, userName: 'bob' });
  });

  it('resetAllStates calls chatNavigationService.resetSelectedChat', () => {
    service.resetAllStates();
    expect(chatNavigationServiceSpy.resetSelectedChat).toHaveBeenCalled();
  });

  it('resetEditingStates calls messageStateService.resetEditingStates', () => {
    service.resetEditingStates();
    expect(messageStateServiceSpy.resetEditingStates).toHaveBeenCalled();
  });
});
