import { TestBed } from '@angular/core/testing';
import { OtoChatStore } from '../oto-chat.page.store';
import { OtoChatApiService } from '../../api/oto-chat/oto-chat-hub.api';
import { OtoMessagesService } from '../../api/oto-message/oto-messages.api';
import { of, Subject } from 'rxjs';
import { OtoChat } from '../../model/oto.chat';
import { OtoMessage } from '../../../../entities/oto-message';

describe('OtoChatStore', () => {
  let store: OtoChatStore;
  let chatApiSpy: jasmine.SpyObj<OtoChatApiService>;
  let messageApiSpy: jasmine.SpyObj<OtoMessagesService>;

  let userDeleted$: Subject<any>;
  let userUpdated$: Subject<any>;

  beforeEach(() => {
    userDeleted$ = new Subject();
    userUpdated$ = new Subject();

    chatApiSpy = jasmine.createSpyObj('OtoChatApiService', [], {
      userInfoDeleted$: userDeleted$,
      userInfoUpdated$: userUpdated$
    });

    messageApiSpy = jasmine.createSpyObj('OtoMessagesService', [
      'sendMessage', 'replyToMessage', 'editMessage', 'deleteMessage'
    ]);

    TestBed.configureTestingModule({
      providers: [
        OtoChatStore,
        { provide: OtoChatApiService, useValue: chatApiSpy },
        { provide: OtoMessagesService, useValue: messageApiSpy }
      ]
    });

    store = TestBed.inject(OtoChatStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('patch and state snapshot', () => {
    it('should patch state correctly', () => {
      store.patch({ currentUserNickName: 'user1' });
      expect(store.snapshot.currentUserNickName).toBe('user1');
    });
  });

  describe('selectChat & clearSelectedChat', () => {
    const chat: OtoChat = { nickName: 'nick', image: 'img' };

    it('should select chat', () => {
      store.selectChat(chat);
      expect(store.snapshot.selectedChat).toEqual(chat);
      expect(store.snapshot.editingMessage).toBeUndefined();
      expect(store.snapshot.replyingToMessage).toBeUndefined();
    });

    it('should clear selected chat', () => {
      store.selectChat(chat);
      store.clearSelectedChat();
      expect(store.snapshot.selectedChat).toBeUndefined();
      expect(store.snapshot.editingMessage).toBeUndefined();
      expect(store.snapshot.replyingToMessage).toBeUndefined();
    });
  });

  describe('editing and replying', () => {
    const msg: OtoMessage = { messageId: '1', content: 'hi' } as any;

    it('should set editing message', () => {
      store.setEditingMessage(msg);
      expect(store.snapshot.editingMessage).toEqual(msg);
      expect(store.snapshot.replyingToMessage).toBeUndefined();
    });

    it('should set replying message', () => {
      store.setReplyingTo(msg);
      expect(store.snapshot.replyingToMessage).toEqual(msg);
      expect(store.snapshot.editingMessage).toBeUndefined();
    });
  });

  describe('sendMessage', () => {
    const chat: OtoChat = { nickName: 'nick', image: 'img' };

    it('should not send if no chat selected', async () => {
      await store.sendMessage('Hello');
      expect(messageApiSpy.sendMessage).not.toHaveBeenCalled();
    });

    it('should send new message if not replying', async () => {
      store.selectChat(chat);
      await store.sendMessage('Hello');
      expect(messageApiSpy.sendMessage).toHaveBeenCalledWith('nick', 'Hello');
    });

    it('should reply to message if replyingToMessage is set', async () => {
      store.selectChat(chat);
      const msg: OtoMessage = { messageId: '1', content: 'hi' } as any;
      store.setReplyingTo(msg);

      await store.sendMessage('Reply');

      expect(messageApiSpy.replyToMessage).toHaveBeenCalledWith('1', 'Reply', 'nick');
      expect(store.snapshot.replyingToMessage).toBeUndefined();
    });
  });

  describe('editMessage', () => {
    it('should edit message and reset editingMessage', async () => {
      const msg: OtoMessage = { messageId: '1', content: 'hi' } as any;
      store.setEditingMessage(msg);

      await store.editMessage('1', 'new content');

      expect(messageApiSpy.editMessage).toHaveBeenCalledWith('1', 'new content');
      expect(store.snapshot.editingMessage).toBeUndefined();
    });
  });

  describe('deleteMessage', () => {
    it('should call deleteMessage with soft type', async () => {
      await store.deleteMessage('1', false);
      expect(messageApiSpy.deleteMessage).toHaveBeenCalledWith('1', 'soft');
    });

    it('should call deleteMessage with hard type', async () => {
      await store.deleteMessage('1', true);
      expect(messageApiSpy.deleteMessage).toHaveBeenCalledWith('1', 'hard');
    });
  });

  describe('user events', () => {
    it('should clear chat and show notification on user deletion', () => {
      const chat: OtoChat = { nickName: 'deletedUser', image: 'img' };
      store.selectChat(chat);

      userDeleted$.next({ userName: 'deletedUser' });

      expect(store.snapshot.selectedChat).toBeUndefined();
      expect(store.snapshot.showUserDeletedNotification).toBeTrue();
      expect(store.snapshot.deletedUserName).toBe('deletedUser');
    });

    it('should update currentUserNickName on user update', () => {
      store.patch({ currentUserNickName: 'oldNick' });
      userUpdated$.next({ oldNickName: 'oldNick', userName: 'newNick' });

      expect(store.snapshot.currentUserNickName).toBe('newNick');
    });

    it('should update selectedChat nick and image on user update', () => {
      const chat: OtoChat = { nickName: 'oldUser', image: 'oldImg' };
      store.selectChat(chat);

      userUpdated$.next({ oldNickName: 'oldUser', userName: 'newUser', image: 'newImg' });

      expect(store.snapshot.selectedChat?.nickName).toBe('newUser');
      expect(store.snapshot.selectedChat?.image).toBe('newImg');
    });

    it('should keep old image if updated image is missing', () => {
      const chat: OtoChat = { nickName: 'oldUser', image: 'oldImg' };
      store.selectChat(chat);

      userUpdated$.next({ oldNickName: 'oldUser', userName: 'newUser', image: undefined });

      expect(store.snapshot.selectedChat?.nickName).toBe('newUser');
      expect(store.snapshot.selectedChat?.image).toBe('oldImg');
    });
  });

  describe('userInfoUpdated$ early return', () => {
    it('should do nothing if updated is null', () => {
      store.patch({ currentUserNickName: 'user1' });
  
      userUpdated$.next(null);

      expect(store.snapshot.currentUserNickName).toBe('user1');
      expect(store.snapshot.selectedChat).toBeUndefined();
    });
  
    it('should do nothing if updated is undefined', () => {
      store.patch({ currentUserNickName: 'user1' });
  
      userUpdated$.next(undefined as any);
  
      expect(store.snapshot.currentUserNickName).toBe('user1');
      expect(store.snapshot.selectedChat).toBeUndefined();
    });
  });  
});
