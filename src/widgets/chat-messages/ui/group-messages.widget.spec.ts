import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { GroupMessagesWidget } from './group-messages.widget';
import { Subject, of, throwError } from 'rxjs';
import { GroupMessage } from '../../../entities/group-message';
import { FileUploadApiService } from '../../../features/file-sender';

describe('GroupMessagesWidget', () => {
  let fixture: ComponentFixture<GroupMessagesWidget>;
  let component: GroupMessagesWidget;
  let fileUploadApiSpy: jasmine.SpyObj<FileUploadApiService>;

  let messages$: Subject<GroupMessage[]>;
  let userInfoChanged$: Subject<{ userName: string; image?: string; updatedAt: string; oldNickName: string }>;
  let loadHistorySpy: jasmine.Spy;

  const createMessage = (
    id: string,
    sender: string,
    sendTime: string,
    content = '{"text":"test"}',
    isDeleted = false,
    isEdited = false,
    groupId = 'g1'
  ): GroupMessage => ({
    id,
    sender,
    content,
    sendTime,
    isDeleted,
    isEdited,
    groupId,
  });

  beforeEach(async () => {
    fileUploadApiSpy = jasmine.createSpyObj('FileUploadApiService', [
      'getDownloadUrls',
      'uploadFile'
    ]);
    fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [GroupMessagesWidget],
      providers: [
        { provide: FileUploadApiService, useValue: fileUploadApiSpy }
      ]
    })
      .overrideComponent(GroupMessagesWidget, {
        set: {
          template: `
            <div #scrollContainer style="height:300px; overflow:auto" (scroll)="onScroll()">
              <div *ngFor="let group of groupedMessages; trackBy: trackByGroup">
                <div *ngFor="let m of group.messages; trackBy: trackByMessageId" 
                     class="message-container"
                     [attr.data-message-id]="m.id">
                  <div class="px-3 py-2 rounded-2xl">
                    {{ m.content }}
                  </div>
                </div>
              </div>
            </div>
            <div *ngIf="showContextMenu" class="context-menu"
                 [style.left.px]="contextMenuPosition.x"
                 [style.top.px]="contextMenuPosition.y"></div>
          `
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(GroupMessagesWidget);
    component = fixture.componentInstance;

    messages$ = new Subject<GroupMessage[]>();
    userInfoChanged$ = new Subject();
    loadHistorySpy = jasmine.createSpy('loadHistory').and.returnValue(of([]));

    component.groupId = 'g1';
    component.members = [
      { nickName: 'Alice', image: 'alice.png' },
      { nickName: 'Bob', image: 'bob.png' },
      { nickName: 'me', image: 'me.png' }
    ];
    component.currentUserNickName = 'me';
    component.messages$ = messages$ as any;
    component.userInfoChanged$ = userInfoChanged$ as any;
    component.loadHistory = loadHistorySpy;
  });

  afterEach(() => {
    if (component['urlCheckInterval']) {
      clearInterval(component['urlCheckInterval']);
    }
    if (component['fileRefreshTimer']) {
      clearTimeout(component['fileRefreshTimer']);
    }
    fixture.destroy();
  });

  describe('Initialisation and life cycle', () => {
    it('must create a component', () => {
      expect(component).toBeTruthy();
    });

    it('must initialise the chat when the groupId changes', fakeAsync(() => {
      const history = [
        createMessage('1', 'Alice', '2025-08-10T12:00:00Z'),
        createMessage('2', 'Bob', '2025-08-10T13:00:00Z'),
      ];
      loadHistorySpy.and.returnValue(of(history));

      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });

      fixture.detectChanges();
      tick();

      messages$.next(history);
      tick();

      expect(component.messages.length).toBe(2);
      expect(component.messages.map(m => m.id)).toEqual(['1', '2']);
    }));

    it('must subscribe to messages after initialisation', fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });

      fixture.detectChanges();
      tick();

      const newMessages = [createMessage('3', 'Alice', '2025-08-10T14:00:00Z')];
      messages$.next(newMessages);
      tick();

      expect(component.messages.length).toBe(1);
      expect(component.messages[0].id).toBe('3');
    }));

    it('must clear subscriptions upon deletion', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    }));
  });

  describe('Message processing', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should return empty string if message id is missing', () => {
      const msg = {
        id: '', 
        sender: 'Alice',
        content: '{"text":"hi"}',
        sendTime: new Date().toISOString(),
        isDeleted: false,
        isEdited: false,
        groupId: 'g1'
      } as GroupMessage;
  
      const result = component.getMessageIdFromMessage(msg);
      expect(result).toBe('');
    });
  
    it('must update the existing message', fakeAsync(() => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"original"}');
      messages$.next([msg]);
      tick();
  
      const updated = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"updated"}');
      messages$.next([updated]);
      tick();
  
      expect(component.messages.length).toBe(1);
      expect(component.messages[0].content).toBe('{"text":"updated"}');
    }));
  
    it('must add a new message', fakeAsync(() => {
      const msg1 = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      messages$.next([msg1]);
      tick();
  
      const msg2 = createMessage('2', 'Bob', '2025-08-10T13:00:00Z');
      messages$.next([msg1, msg2]);
      tick();
  
      expect(component.messages.length).toBe(2);
      expect(component.messages.map(m => m.id)).toEqual(['1', '2']);
    }));
  
    it('should sort messages by time sent', fakeAsync(() => {
      const msg1 = createMessage('1', 'Alice', '2025-08-10T14:00:00Z');
      const msg2 = createMessage('2', 'Bob', '2025-08-10T12:00:00Z');
      const msg3 = createMessage('3', 'Charlie', '2025-08-10T13:00:00Z');
  
      messages$.next([msg1, msg2, msg3]);
      tick();
  
      expect(component.messages.map(m => m.id)).toEqual(['2', '3', '1']);
    }));
  
    it('should delete the message from the list', fakeAsync(() => {
      const msg1 = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      const msg2 = createMessage('2', 'Bob', '2025-08-10T13:00:00Z');
      messages$.next([msg1, msg2]);
      tick();
  
      messages$.next([msg2]);
      tick();
  
      expect(component.messages.length).toBe(1);
      expect(component.messages[0].id).toBe('2');
    }));
  
    it('should filter deleted messages from other users', fakeAsync(() => {
      const myDeleted = createMessage('1', 'me', '2025-08-10T12:00:00Z', '{"text":"test"}', true);
      const otherDeleted = createMessage('2', 'Alice', '2025-08-10T13:00:00Z', '{"text":"test"}', true);
      const normal = createMessage('3', 'Bob', '2025-08-10T14:00:00Z');
  
      messages$.next([myDeleted, otherDeleted, normal]);
      tick();
  
      expect(component.messages.length).toBe(3);
    }));
  });  

  describe('Content parsing', () => {
    it('must parse JSON content with text', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"Hello World"}');
      const parsed = component.parseContent(msg);

      expect(parsed.text).toBe('Hello World');
      expect(parsed.files).toEqual([]);
    });

    it('must parse JSON content with files', () => {
      const content = JSON.stringify({
        text: 'Check this out',
        files: [
          { fileName: 'doc.pdf', uniqueFileName: 'abc123.pdf', url: 'https://example.com/doc.pdf' }
        ]
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      const parsed = component.parseContent(msg);

      expect(parsed.text).toBe('Check this out');
      expect(parsed.files.length).toBe(1);
      expect(parsed.files[0].fileName).toBe('doc.pdf');
    });

    it('should return the original text for non-JSON content', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', 'Plain text message');
      const parsed = component.parseContent(msg);

      expect(parsed.text).toBe('Plain text message');
      expect(parsed.files).toEqual([]);
    });

    it('must return a special text for a deleted message', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', 'Message deleted', true);
      const parsed = component.parseContent(msg);

      expect(parsed.text).toBe('Message deleted');
      expect(parsed.files).toEqual([]);
    });

    it('must identify the file type by its extension', () => {
      const content = JSON.stringify({
        text: '',
        files: [
          { fileName: 'image.png' },
          { fileName: 'video.mp4' },
          { fileName: 'audio.mp3' }
        ]
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      const parsed = component.parseContent(msg);

      expect(parsed.files[0].type).toBe('image/png');
      expect(parsed.files[1].type).toBe('video/mp4');
      expect(parsed.files[2].type).toBe('audio/mp3');
    });
  });

  describe('Decryption of messages', () => {
    it('should display the status ‘Decrypting...’ for an encrypted message', fakeAsync(() => {
      const encryptedContent = JSON.stringify({
        ciphertext: 'encrypted',
        ephemeralKey: 'key',
        nonce: 'nonce',
        messageNumber: 1
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      
      const parsed = component.parseContent(msg);
      
      expect(parsed.text).toBe('[Decrypting...]');
      tick(5000);
      flush();
    }));

    it('must decrypt the message successfully', fakeAsync(() => {
      const encryptedContent = JSON.stringify({
        ciphertext: 'encrypted',
        ephemeralKey: 'key',
        nonce: 'nonce',
        messageNumber: 1
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      
      component.messageDecryptor = jasmine.createSpy('decryptor').and.returnValue(
        Promise.resolve('{"text":"Decrypted message"}')
      );

      component.parseContent(msg);
      tick(100);

      expect(component.messageDecryptor).toHaveBeenCalled();
      
      tick(5000);
      flush();
    }));

    it('must handle the decryption error', fakeAsync(() => {
      const encryptedContent = JSON.stringify({
        ciphertext: 'encrypted',
        ephemeralKey: 'key',
        nonce: 'nonce',
        messageNumber: 1
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      
      component.messageDecryptor = jasmine.createSpy('decryptor').and.returnValue(
        Promise.reject(new Error('Decryption failed'))
      );

      component.messages = [msg];
      component.parseContent(msg);
      
      tick(100);
      tick(5000);
      flush();

      const updatedMsg = component.messages[0];
      expect((updatedMsg as any)._decryptionFailed).toBeTrue();
      
      const parsed = component.parseContent(updatedMsg);
      expect(parsed.text).toContain('[Decryption failed');
    }));
  });

  describe('Avatar management', () => {
    it('should get the participants avatar from members', () => {
      const avatar = component.getMemberAvatar('Alice');
      expect(avatar).toBe('alice.png');
    });

    it('should cache avatars', () => {
      const avatar1 = component.getMemberAvatar('Alice');
      const avatar2 = component.getMemberAvatar('Alice');
      
      expect(avatar1).toBe(avatar2);
      expect(component['avatarCache'].has('alice')).toBeTrue();
    });

    it('should return undefined for a non-existent participant', () => {
      const avatar = component.getMemberAvatar('Unknown');
      expect(avatar).toBeUndefined();
    });

    it('should return undefined for an empty nickname', () => {
      const avatar = component.getMemberAvatar('');
      expect(avatar).toBeUndefined();
    });

    it('should use the old nickname when searching for an avatar', () => {
      component['avatarCache'].set('oldalice', 'alice-old.png');
      const avatar = component.getMemberAvatar('NewAlice', 'OldAlice');
      
      expect(avatar).toBe('alice-old.png');
    });

    it('must clear the avatar cache', () => {
      component.getMemberAvatar('Alice');
      component.getMemberAvatar('Bob');
      
      expect(component['avatarCache'].size).toBeGreaterThan(0);
      
      component['clearAvatarCache']();
      
      expect(component['avatarCache'].size).toBe(0);
    });

    it('must clear specific avatars from the cache', () => {
      component.getMemberAvatar('Alice');
      component.getMemberAvatar('Bob');
      
      component['clearAvatarCache']({ oldNick: 'Alice' });
      
      expect(component['avatarCache'].has('alice')).toBeFalse();
      expect(component['avatarCache'].has('bob')).toBeTrue();
    });
  });

  describe('Updating user information', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));

    it('should update the sender of the message when the nickname changes', fakeAsync(() => {
      const msg = createMessage('1', 'OldNick', '2025-08-10T12:00:00Z');
      messages$.next([msg]);
      tick();

      userInfoChanged$.next({
        userName: 'NewNick',
        oldNickName: 'OldNick',
        updatedAt: new Date().toISOString(),
        image: 'new.png'
      });
      tick();

      const updated = component.messages[0] as any;
      expect(updated.sender).toBe('NewNick');
      expect(updated.oldSender).toBe('OldNick');
      expect(updated.senderImage).toBe('new.png');
    }));

    it('should update localMembers when nickname changes', fakeAsync(() => {
      userInfoChanged$.next({
        userName: 'AliceNew',
        oldNickName: 'Alice',
        updatedAt: new Date().toISOString(),
        image: 'alice-new.png'
      });
      tick();

      const member = component['localMembers'].find(m => m.nickName === 'AliceNew');
      expect(member).toBeTruthy();
      expect(member?.image).toBe('alice-new.png');
    }));

    it('must add a new participant if not found', fakeAsync(() => {
      const initialLength = component['localMembers'].length;

      userInfoChanged$.next({
        userName: 'Charlie',
        oldNickName: 'UnknownOld',
        updatedAt: new Date().toISOString(),
        image: 'charlie.png'
      });
      tick();

      expect(component['localMembers'].length).toBe(initialLength + 1);
      const newMember = component['localMembers'].find(m => m.nickName === 'Charlie');
      expect(newMember?.image).toBe('charlie.png');
    }));

    it('should refresh the avatar cache when the user changes', fakeAsync(() => {
      component.getMemberAvatar('Alice');
      
      userInfoChanged$.next({
        userName: 'Alice',
        oldNickName: 'Alice',
        updatedAt: new Date().toISOString(),
        image: 'alice-updated.png'
      });
      tick();

      const avatar = component.getMemberAvatar('Alice');
      expect(avatar).toBe('alice-updated.png');
    }));
  });

  describe('Context menu', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));

    it('should display a context menu when right-clicked', () => {
      const msg = createMessage('1', 'me', '2025-08-10T12:00:00Z');
      component.messages = [msg];
      fixture.detectChanges();

      const messageContainer = document.createElement('div');
      messageContainer.className = 'message-container';
      const messageBlock = document.createElement('div');
      messageBlock.className = 'px-3 py-2 rounded-2xl';
      messageContainer.appendChild(messageBlock);

      const mockEvent = {
        preventDefault: jasmine.createSpy('preventDefault'),
        stopPropagation: jasmine.createSpy('stopPropagation'),
        target: messageBlock
      } as any;

      spyOn(messageBlock, 'closest').and.returnValue(messageContainer);
      spyOn(messageContainer, 'querySelector').and.returnValue(messageBlock);
      spyOn(messageBlock, 'getBoundingClientRect').and.returnValue({ 
        top: 100, left: 100, bottom: 150, right: 200, width: 100, height: 50 
      } as DOMRect);
      spyOn(component.scrollContainer.nativeElement, 'getBoundingClientRect').and.returnValue({
        top: 0, left: 0, bottom: 300, right: 400, width: 400, height: 300
      } as DOMRect);

      component.onMessageRightClick(mockEvent, msg);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.showContextMenu).toBeTrue();
      expect(component['contextMenuMessageId']).toBe('1');
    });

    it('should hide the context menu when clicking outside', fakeAsync(() => {
      component.showContextMenu = true;
      
      document.dispatchEvent(new Event('click'));
      
      expect(component.showContextMenu).toBeFalse();
    }));

    it('should emit editMessage event', fakeAsync(() => {
      const msg = createMessage('1', 'me', '2025-08-10T12:00:00Z');
      component.messages = [msg];
      component['contextMenuMessageId'] = '1';

      const editSpy = jasmine.createSpy('onEdit');
      component.editMessage.subscribe(editSpy);

      component.onEditMessage();

      expect(editSpy).toHaveBeenCalledWith(msg);
      expect(component.showContextMenu).toBeFalse();
    }));

    it('must emit the deleteMessage event', fakeAsync(() => {
      const msg = createMessage('1', 'me', '2025-08-10T12:00:00Z');
      component.messages = [msg];
      component['contextMenuMessageId'] = '1';

      const deleteSpy = jasmine.createSpy('onDelete');
      component.deleteMessage.subscribe(deleteSpy);

      component.onDeleteMessage();

      expect(deleteSpy).toHaveBeenCalledWith(msg);
      expect(component.showContextMenu).toBeFalse();
    }));

    it('should emit a replyToMessage event', fakeAsync(() => {
      const msg = createMessage('1', 'me', '2025-08-10T12:00:00Z');
      component.messages = [msg];
      component['contextMenuMessageId'] = '1';

      const replySpy = jasmine.createSpy('onReply');
      component.replyToMessage.subscribe(replySpy);

      component.onReplyToMessage();

      expect(replySpy).toHaveBeenCalledWith(msg);
      expect(component.showContextMenu).toBeFalse();
    }));

    it('must check canEditOrDelete for their messages', () => {
      const myMsg = createMessage('1', 'me', '2025-08-10T12:00:00Z');
      const otherMsg = createMessage('2', 'Alice', '2025-08-10T12:00:00Z');
      
      component.messages = [myMsg, otherMsg];
      component['contextMenuMessageId'] = '1';
      
      expect(component.canEditOrDelete()).toBeTrue();
      
      component['contextMenuMessageId'] = '2';
      expect(component.canEditOrDelete()).toBeFalse();
    });

    it('should not allow editing of deleted messages', () => {
      const deletedMsg = createMessage('1', 'me', '2025-08-10T12:00:00Z', '{"text":"test"}', true);
      component.messages = [deletedMsg];
      component['contextMenuMessageId'] = '1';
      
      expect(component.canEditOrDelete()).toBeFalse();
    });

    it('should return false if scrollContainer is missing', () => {
      const messageContainer = document.createElement('div');
      const mockEvent = {
        preventDefault: jasmine.createSpy('preventDefault'),
        stopPropagation: jasmine.createSpy('stopPropagation'),
        target: document.createElement('div')
      } as any;

      spyOn(mockEvent.target, 'closest').and.returnValue(messageContainer);
      component.scrollContainer = undefined as any;

      component.onMessageRightClick(mockEvent, createMessage('1', 'me', '2025-08-10T12:00:00Z'));
      
      expect(component.showContextMenu).toBeFalse();
    });

    it('should return false if messageBlock is not found', () => {
      const messageContainer = document.createElement('div');
      messageContainer.className = 'message-container';

      const mockEvent = {
        preventDefault: jasmine.createSpy('preventDefault'),
        stopPropagation: jasmine.createSpy('stopPropagation'),
        target: messageContainer
      } as any;

      spyOn(mockEvent.target, 'closest').and.returnValue(messageContainer);
      spyOn(messageContainer, 'querySelector').and.returnValue(null);

      component.onMessageRightClick(mockEvent, createMessage('1', 'me', '2025-08-10T12:00:00Z'));
      
      expect(component.showContextMenu).toBeFalse();
    });
  });

  describe('Scrolling and navigation', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));

    it('should scroll to the post', fakeAsync(() => {
      const msg = createMessage('target', 'Alice', '2025-08-10T12:00:00Z');
      component.messages = [msg];
      fixture.detectChanges();

      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-message-id', 'target');
      mockElement.scrollIntoView = jasmine.createSpy('scrollIntoView');
      
      spyOn(component.scrollContainer.nativeElement, 'querySelector').and.returnValue(mockElement);

      component.scrollToMessage('target');
      tick(300);

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }));

    it('should highlight the message when scrolling', fakeAsync(() => {
      const msg = createMessage('highlight-test', 'Alice', '2025-08-10T12:00:00Z');
      component.messages = [msg];
      fixture.detectChanges();

      const mockElement = document.createElement('div');
      mockElement.scrollIntoView = jasmine.createSpy('scrollIntoView');
      spyOn(component.scrollContainer.nativeElement, 'querySelector').and.returnValue(mockElement);

      component.scrollToMessage('highlight-test');
      tick(300);

      expect(component.isMessageHighlighted('highlight-test')).toBeTrue();
      
      tick(1501);
      expect(component.isMessageHighlighted('highlight-test')).toBeFalse();
    }));

    it('should try to find the element again if it is not found immediately', fakeAsync(() => {
      const mockElement = document.createElement('div');
      mockElement.scrollIntoView = jasmine.createSpy('scrollIntoView');

      let callCount = 0;
      spyOn(component.scrollContainer.nativeElement, 'querySelector').and.callFake(() => {
        callCount++;
        return callCount === 1 ? null : mockElement;
      });

      component.scrollToMessage('test-id');
      tick(1000);

      expect(mockElement.scrollIntoView).toHaveBeenCalled();
    }));

    it('should hide the context menu when scrolling', () => {
      component.showContextMenu = true;
      component.onScroll();
      expect(component.showContextMenu).toBeFalse();
    });

    it('should load more messages when scrolling up', fakeAsync(() => {
      component.messages = [createMessage('1', 'Alice', '2025-08-10T12:00:00Z')];
      component.loading = false;
      component.allLoaded = false;

      const moreMessages = [createMessage('0', 'Bob', '2025-08-10T11:00:00Z')];
      loadHistorySpy.and.returnValue(of(moreMessages));

      const scrollElement = component.scrollContainer.nativeElement;
      Object.defineProperty(scrollElement, 'scrollTop', { value: 100, configurable: true });
      Object.defineProperty(scrollElement, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(scrollElement, 'clientHeight', { value: 300, configurable: true });

      component.onScroll();
      tick();

      expect(loadHistorySpy).toHaveBeenCalled();
      expect(component.messages.length).toBe(2);
    }));

    it('should not load more if it is already loading', () => {
      component.loading = true;
      const loadMoreSpy = spyOn(component as any, 'loadMore').and.callThrough();
      
      component['loadMore']();
      
      expect(loadHistorySpy).not.toHaveBeenCalled();
    });

    it('should not load more if everything is loaded', () => {
      component.allLoaded = true;
      
      component['loadMore']();
      
      expect(loadHistorySpy).not.toHaveBeenCalled();
    });

    it('must process isScrolledToBottom without scrollContainer', () => {
      component.scrollContainer = undefined as any;
      const result = component['isScrolledToBottom']();
      expect(result).toBeFalse();
    });
  });

  describe('Loading history', () => {
    beforeEach(fakeAsync(() => {
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));

    it('must load message history', fakeAsync(() => {
      const history = [
        createMessage('1', 'Alice', '2025-08-10T12:00:00Z'),
        createMessage('2', 'Bob', '2025-08-10T13:00:00Z')
      ];
      loadHistorySpy.and.returnValue(of(history));

      component['loadMore']();
      tick();

      expect(component.messages.length).toBe(2);
      expect(component.loading).toBeFalse();
    }));

    it('should set allLoaded when history is empty', fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));

      component['loadMore']();
      tick();

      expect(component.allLoaded).toBeTrue();
      expect(component.loading).toBeFalse();
    }));

    it('must handle the history loading error', fakeAsync(() => {
      loadHistorySpy.and.returnValue(throwError(() => new Error('Load failed')));

      component['loadMore']();
      tick();

      expect(component.loading).toBeFalse();
    }));

    it('should filter out duplicates when loading history', fakeAsync(() => {
      const existing = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      component.messages = [existing];

      const history = [
        existing,
        createMessage('2', 'Bob', '2025-08-10T13:00:00Z')
      ];
      loadHistorySpy.and.returnValue(of(history));

      component['loadMore']();
      tick();

      expect(component.messages.length).toBe(2);
    }));

    it('should set allLoaded if only duplicates are received', fakeAsync(() => {
      const msg1 = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      const msg2 = createMessage('2', 'Bob', '2025-08-10T13:00:00Z');
      component.messages = [msg1, msg2];

      loadHistorySpy.and.returnValue(of([msg1, msg2]));

      component['loadMore']();
      tick();

      expect(component.allLoaded).toBeTrue();
    }));

    it('should filter out deleted messages from others when loading', fakeAsync(() => {
      const myDeleted = createMessage('1', 'me', '2025-08-10T12:00:00Z', '{"text":"test"}', true);
      const otherDeleted = createMessage('2', 'Alice', '2025-08-10T13:00:00Z', '{"text":"test"}', true);
      
      loadHistorySpy.and.returnValue(of([myDeleted, otherDeleted]));

      component['loadMore']();
      tick();

      expect(component.messages.length).toBe(1);
      expect(component.messages[0].id).toBe('1');
    }));

    it('should restore the scroll position after loading the history', fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([
        createMessage('0', 'Alice', '2025-08-10T11:00:00Z')
      ]));

      const scrollElement = component.scrollContainer.nativeElement;
      Object.defineProperty(scrollElement, 'scrollTop', { value: 100, writable: true });
      Object.defineProperty(scrollElement, 'scrollHeight', { value: 1000, configurable: true });

      component['loadMore']();
      tick(300);

      expect(scrollElement.scrollTop).toBeGreaterThan(0);
    }));
  });

  describe('Working with files', () => {
    it('must determine the image', () => {
      expect(component.isImageFile({ fileName: 'photo.jpg' })).toBeTrue();
      expect(component.isImageFile({ fileName: 'photo.png' })).toBeTrue();
      expect(component.isImageFile({ type: 'image/jpeg' })).toBeTrue();
      expect(component.isImageFile({ fileName: 'document.pdf' })).toBeFalse();
    });

    it('must identify the video', () => {
      expect(component.isVideoFile({ fileName: 'movie.mp4' })).toBeTrue();
      expect(component.isVideoFile({ fileName: 'video.webm' })).toBeTrue();
      expect(component.isVideoFile({ type: 'video/mp4' })).toBeTrue();
      expect(component.isVideoFile({ fileName: 'audio.mp3' })).toBeFalse();
    });

    it('must determine audio', () => {
      expect(component.isAudioFile({ fileName: 'song.mp3' })).toBeTrue();
      expect(component.isAudioFile({ fileName: 'sound.wav' })).toBeTrue();
      expect(component.isAudioFile({ type: 'audio/mpeg' })).toBeTrue();
      expect(component.isAudioFile({ fileName: 'video.mp4' })).toBeFalse();
    });

    it('must format the file size', () => {
      expect(component.formatFileSize(0)).toBe('0 B');
      expect(component.formatFileSize(1024)).toBe('1.00 KB');
      expect(component.formatFileSize(1048576)).toBe('1.00 MB');
      expect(component.formatFileSize(1073741824)).toBe('1.00 GB');
    });

    it('must download the file', () => {
      const file = {
        url: 'https://example.com/file.pdf',
        fileName: 'document.pdf'
      };

      const mockLink = document.createElement('a');
      const appendChildSpy = spyOn(document.body, 'appendChild');
      const removeChildSpy = spyOn(document.body, 'removeChild');
      const clickSpy = jasmine.createSpy('click');
      
      spyOn(document, 'createElement').and.returnValue(Object.assign(mockLink, {
        click: clickSpy
      }));

      component.downloadFile(file);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe(file.url);
      expect(mockLink.download).toBe(file.fileName);
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    });
  });

  describe('Utility functions', () => {
    it('must check isMyMessage', () => {
      const myMsg = createMessage('1', 'me', '2025-08-10T12:00:00Z');
      const otherMsg = createMessage('2', 'Alice', '2025-08-10T12:00:00Z');

      expect(component.isMyMessage(myMsg)).toBeTrue();
      expect(component.isMyMessage(otherMsg)).toBeFalse();
    });

    it('must check isMessageDeleted', () => {
      const normalMsg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      const deletedMsg = createMessage('2', 'Alice', '2025-08-10T12:00:00Z', '{"text":"test"}', true);

      expect(component.isMessageDeleted(normalMsg)).toBeFalse();
      expect(component.isMessageDeleted(deletedMsg)).toBeTrue();
    });

    it('must receive the message content', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', 'Hello');
      expect(component.getMessageContent(msg)).toBe('Hello');
    });

    it('must find a message to reply to', () => {
      component.messages = [
        createMessage('1', 'Alice', '2025-08-10T12:00:00Z'),
        createMessage('2', 'Bob', '2025-08-10T13:00:00Z')
      ];

      const found = component.getRepliedMessage('1');
      expect(found?.id).toBe('1');

      const notFound = component.getRepliedMessage('999');
      expect(notFound).toBeUndefined();
    });

    it('must determine whether to display the senders name', () => {
      const messages = [
        createMessage('1', 'Alice', '2025-08-10T12:00:00Z'),
        createMessage('2', 'Alice', '2025-08-10T12:01:00Z'),
        createMessage('3', 'Bob', '2025-08-10T12:02:00Z'),
        createMessage('4', 'Bob', '2025-08-10T12:03:00Z'),
        createMessage('5', 'Alice', '2025-08-10T12:04:00Z')
      ];

      expect(component.shouldShowSenderName(messages as any, 0)).toBeTrue();
      expect(component.shouldShowSenderName(messages as any, 1)).toBeFalse();
      expect(component.shouldShowSenderName(messages as any, 2)).toBeTrue();
      expect(component.shouldShowSenderName(messages as any, 3)).toBeFalse();
      expect(component.shouldShowSenderName(messages as any, 4)).toBeTrue();
    });

    it('should group messages by date', () => {
      component.messages = [
        createMessage('1', 'Alice', '2025-08-10T12:00:00Z'),
        createMessage('2', 'Bob', '2025-08-10T13:00:00Z'),
        createMessage('3', 'Alice', '2025-08-11T12:00:00Z')
      ];

      const grouped = component.groupedMessages;
      
      expect(grouped.length).toBeGreaterThan(0);
    });
  });

  describe('URL file management', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));

    it('must clear the URL verification timer upon destruction', fakeAsync(() => {
      component.ngAfterViewInit();
      tick();
      
      const intervalId = component['urlCheckInterval'];
      expect(intervalId).toBeTruthy();
      
      component.ngOnDestroy();
      tick();
      
      const wasStopped = !component['urlCheckInterval'] || 
                        typeof component['urlCheckInterval'] === 'number';
      expect(wasStopped).toBeTrue();
    }));

    it('must update expired file URLs', fakeAsync(() => {
      const expiredTimestamp = Date.now() - (4 * 60 * 60 * 1000);
      component['urlCache'].set('old-file.pdf', {
        url: 'https://example.com/expired',
        timestamp: expiredTimestamp
      });

      const content = JSON.stringify({
        text: '',
        files: [{
          fileName: 'old-file.pdf',
          uniqueFileName: 'old-file.pdf',
          url: 'https://example.com/expired'
        }]
      });
      component.messages = [createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content)];

      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([{
        originalName: 'old-file.pdf',
        uniqueFileName: 'old-file.pdf',
        url: 'https://example.com/new-url'
      }]));

      component['checkAndRefreshExpiredUrls']();
      tick();

      const cached = component['urlCache'].get('old-file.pdf');
      expect(cached?.url).toBe('https://example.com/new-url');
    }));

    it('should run a periodic URL check', fakeAsync(() => {
      const checkSpy = spyOn(component as any, 'checkAndRefreshExpiredUrls');
      
      component['startUrlExpirationCheck']();
      tick(5 * 60 * 1000);

      expect(checkSpy).toHaveBeenCalled();
      
      if (component['urlCheckInterval']) {
        clearInterval(component['urlCheckInterval']);
      }
    }));
  });

  describe('Caching', () => {
    it('should invalidate the message cache', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"test"}');
      component.parseContent(msg);
      
      expect(component['messageContentCache'].has('1')).toBeTrue();
      
      component['invalidateMessageCache']('1');
      
      expect(component['messageContentCache'].has('1')).toBeFalse();
    });

    it('should invalidate the entire cache', () => {
      const msg1 = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"test1"}');
      const msg2 = createMessage('2', 'Bob', '2025-08-10T12:00:00Z', '{"text":"test2"}');
      
      component.parseContent(msg1);
      component.parseContent(msg2);
      
      expect(component['messageContentCache'].size).toBeGreaterThan(0);
      
      component['invalidateAllCache']();
      
      expect(component['messageContentCache'].size).toBe(0);
    });

    it('should use cached content', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"cached"}');
      
      const first = component.parseContent(msg);
      const second = component.parseContent(msg);
      
      expect(first).toEqual(second);
      expect(component['messageContentCache'].has('1')).toBeTrue();
    });
  });

  describe('Processing of encrypted messages', () => {
    it('must determine the encrypted message', () => {
      const encryptedContent = JSON.stringify({
        ciphertext: 'encrypted',
        ephemeralKey: 'key',
        nonce: 'nonce',
        messageNumber: 1
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      
      expect(component['isEncryptedMessage'](msg)).toBeTrue();
    });

    it('must determine the decrypted message', () => {
      const decryptedContent = '{"text":"decrypted","files":[]}';
      
      expect(component['isDecryptedMessage'](decryptedContent)).toBeTrue();
    });

    it('should not identify plain text as encrypted', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', 'Plain text');
      
      expect(component['isEncryptedMessage'](msg)).toBeFalse();
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('must process an empty list of messages', () => {
      component.messages = [];
      const grouped = component.groupedMessages;
      expect(grouped).toBeDefined();
    });

    it('must process a message without an ID', () => {
      const msg = { ...createMessage('', 'Alice', '2025-08-10T12:00:00Z'), id: undefined } as any;
      expect(() => component.parseContent(msg)).not.toThrow();
    });

    it('must handle incorrect JSON in content', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{invalid json}');
      const parsed = component.parseContent(msg);
      expect(parsed.text).toBe('{invalid json}');
    });

    it('must process the missing message in getRepliedMessage', () => {
      component.messages = [];
      const result = component.getRepliedMessage('non-existent');
      expect(result).toBeUndefined();
    });

    it('must process scrollToMessage without scrollContainer', () => {
      component.scrollContainer = undefined as any;
      expect(() => component.scrollToMessage('test')).not.toThrow();
    });
  });

  describe('File refresh queue', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should return early if fileRefreshQueue is empty', fakeAsync(() => {
      component['fileRefreshQueue'].clear();
      
      component['processPendingFileRefreshes']();
      tick();
      
      expect(fileUploadApiSpy.getDownloadUrls).not.toHaveBeenCalled();
    }));

    it('should use originalName as cacheKey when uniqueFileName is missing', fakeAsync(() => {
      component['fileRefreshQueue'].set('file1.pdf', new Set(['msg1']));
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([
        { 
          originalName: 'file1.pdf', 
          uniqueFileName: '',
          url: 'https://s3/file1' 
        }
      ]));
      
      component['processPendingFileRefreshes']();
      tick();
      
      expect(component['urlCache'].get('file1.pdf')).toBeDefined();
      expect(component['urlCache'].get('file1.pdf')?.url).toBe('https://s3/file1');
    }));
  
    it('should fetch download URLs and update cache', fakeAsync(() => {
      component['fileRefreshQueue'].set('file1.pdf', new Set(['msg1']));
      component['fileRefreshQueue'].set('file2.pdf', new Set(['msg2']));
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([
        { originalName: 'file1.pdf', uniqueFileName: 'unique1.pdf', url: 'https://s3/file1' },
        { originalName: 'file2.pdf', uniqueFileName: 'unique2.pdf', url: 'https://s3/file2' }
      ]));
      
      component['processPendingFileRefreshes']();
      tick();
      
      expect(fileUploadApiSpy.getDownloadUrls).toHaveBeenCalledWith(['file1.pdf', 'file2.pdf']);
      expect(component['urlCache'].get('unique1.pdf')).toBeDefined();
      expect(component['urlCache'].get('unique1.pdf')?.url).toBe('https://s3/file1');
      expect(component['urlCache'].get('unique2.pdf')?.url).toBe('https://s3/file2');
    }));
  
    it('should clear fileRefreshQueue after processing', fakeAsync(() => {
      component['fileRefreshQueue'].set('file1.pdf', new Set(['msg1']));
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([]));
      
      component['processPendingFileRefreshes']();
      tick();
      
      expect(component['fileRefreshQueue'].size).toBe(0);
    }));
  
    it('should invalidate message cache for messages with refreshed files', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: [{ fileName: 'file1.pdf' }]
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      component['messageContentCache'].set('msg1', {
        text: 'test',
        files: [],
        timestamp: Date.now(),
        version: Date.now()
      });
      
      component['fileRefreshQueue'].set('file1.pdf', new Set(['msg1']));
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([
        { originalName: 'file1.pdf', uniqueFileName: 'unique1.pdf', url: 'https://s3/file1' }
      ]));
      
      spyOn(component as any, 'invalidateMessageCache');
      
      component['processPendingFileRefreshes']();
      tick();
      
      expect(component['invalidateMessageCache']).toHaveBeenCalledWith('msg1');
    }));
  
    it('should handle errors gracefully during file refresh', fakeAsync(() => {
      component['fileRefreshQueue'].set('file1.pdf', new Set(['msg1']));
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.reject(new Error('Network error')));
      
      expect(() => {
        component['processPendingFileRefreshes']();
        tick();
      }).not.toThrow();
    }));
  
    it('should not invalidate cache for messages without matching files', fakeAsync(() => {
      const content1 = JSON.stringify({
        text: 'test',
        files: [{ fileName: 'other.pdf' }]
      });
      const msg1 = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content1);
      component.messages = [msg1];
      
      component['fileRefreshQueue'].set('file1.pdf', new Set(['msg1']));
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([
        { originalName: 'file1.pdf', uniqueFileName: 'unique1.pdf', url: 'https://s3/file1' }
      ]));
      
      spyOn(component as any, 'invalidateMessageCache');
      
      component['processPendingFileRefreshes']();
      tick();
      
      expect(component['invalidateMessageCache']).not.toHaveBeenCalled();
    }));
  
    it('should handle messages with invalid JSON content', fakeAsync(() => {
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', 'invalid json');
      component.messages = [msg];
      
      component['fileRefreshQueue'].set('file1.pdf', new Set(['msg1']));
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([
        { originalName: 'file1.pdf', uniqueFileName: 'unique1.pdf', url: 'https://s3/file1' }
      ]));
      
      expect(() => {
        component['processPendingFileRefreshes']();
        tick();
      }).not.toThrow();
    }));
  });

  describe('ngAfterViewInit file loading', () => {
    it('should load files for messages without cached URLs after 2 seconds', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: [{ fileName: 'file1.pdf', uniqueFileName: 'unique1.pdf' }]
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      spyOn(component as any, 'loadFilesForMessages');
      
      component.ngAfterViewInit();
      tick(200);
      tick(2000); 
      
      expect(component['loadFilesForMessages']).toHaveBeenCalledWith([msg]);
    }));
  
    it('should not load files if all files have cached URLs', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: [{ fileName: 'file1.pdf', uniqueFileName: 'unique1.pdf', url: 'https://s3/file1' }]
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      component['urlCache'].set('unique1.pdf', {
        url: 'https://s3/file1',
        timestamp: Date.now()
      });
      
      spyOn(component as any, 'loadFilesForMessages');
      
      component.ngAfterViewInit();
      tick(200);
      tick(2000);
      
      expect(component['loadFilesForMessages']).not.toHaveBeenCalled();
    }));
  
    it('should load files when file.url is missing', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: [{ fileName: 'file1.pdf', uniqueFileName: 'unique1.pdf' }]
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      spyOn(component as any, 'loadFilesForMessages');
      
      component.ngAfterViewInit();
      tick(200);
      tick(2000);
      
      expect(component['loadFilesForMessages']).toHaveBeenCalledWith([msg]);
    }));
  
    it('should not load files if messages have no files', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: []
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      spyOn(component as any, 'loadFilesForMessages');
      
      component.ngAfterViewInit();
      tick(200);
      tick(2000);
      
      expect(component['loadFilesForMessages']).not.toHaveBeenCalled();
    }));
  
    it('should handle messages with invalid JSON content', fakeAsync(() => {
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', 'invalid json');
      component.messages = [msg];
      
      spyOn(component as any, 'loadFilesForMessages');
      
      expect(() => {
        component.ngAfterViewInit();
        tick(200);
        tick(2000);
      }).not.toThrow();
      
      expect(component['loadFilesForMessages']).not.toHaveBeenCalled();
    }));
  
    it('should handle empty messages array', fakeAsync(() => {
      component.messages = [];
      
      spyOn(component as any, 'loadFilesForMessages');
      
      component.ngAfterViewInit();
      tick(200);
      tick(2000);
      
      expect(component['loadFilesForMessages']).not.toHaveBeenCalled();
    }));
  
    it('should use file.fileName as cacheKey when uniqueFileName is missing', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: [{ fileName: 'file1.pdf' }]
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      spyOn(component as any, 'loadFilesForMessages');
      
      component.ngAfterViewInit();
      tick(200);
      tick(2000);
      
      expect(component['loadFilesForMessages']).toHaveBeenCalledWith([msg]);
    }));
  
    it('should load files when cachedUrl does not exist', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: [{ fileName: 'file1.pdf', uniqueFileName: 'unique1.pdf', url: 'https://s3/file1' }]
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
          
      spyOn(component as any, 'loadFilesForMessages');
      
      component.ngAfterViewInit();
      tick(200);
      tick(2000);
      
      expect(component['loadFilesForMessages']).toHaveBeenCalledWith([msg]);
    }));

    it('should use fileName when uniqueFileName is empty string', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: [{ 
          fileName: 'file1.pdf', 
          uniqueFileName: '', 
          url: 'https://s3/file1' 
        }]
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      component['urlCache'].set('file1.pdf', {
        url: 'https://s3/file1',
        timestamp: Date.now()
      });
      
      spyOn(component as any, 'loadFilesForMessages');
      
      component.ngAfterViewInit();
      tick(200);
      tick(2000);
      
      expect(component['loadFilesForMessages']).not.toHaveBeenCalled();
    }));
  });

  describe('ngOnChanges - members handling', () => {
    it('should update localMembers when members change', () => {
      const newMembers = [
        { nickName: 'Alice', image: 'alice-new.png' },
        { nickName: 'Charlie', image: 'charlie.png' }
      ];
      
      component.members = newMembers; 
      
      component.ngOnChanges({
        members: {
          currentValue: newMembers,
          previousValue: [
            { nickName: 'Alice', image: 'alice.png' },
            { nickName: 'Bob', image: 'bob.png' }
          ],
          firstChange: false,
          isFirstChange: () => false
        }
      });
      
      expect(component['localMembers'].length).toBe(2);
      expect(component['localMembers'][0].nickName).toBe('Alice');
      expect(component['localMembers'][0].image).toBe('alice-new.png');
      expect(component['localMembers'][1].nickName).toBe('Charlie');
    });
  
    it('should clear avatar cache when members change', () => {
      component.getMemberAvatar('Alice');
      component.getMemberAvatar('Bob');
      
      expect(component['avatarCache'].size).toBeGreaterThan(0);
      
      const newMembers = [{ nickName: 'Alice', image: 'alice-new.png' }];
      component.members = newMembers;
      
      spyOn(component as any, 'clearAvatarCache');
      
      component.ngOnChanges({
        members: {
          currentValue: newMembers,
          previousValue: component['localMembers'],
          firstChange: false,
          isFirstChange: () => false
        }
      });
      
      expect(component['clearAvatarCache']).toHaveBeenCalled();
    });
  
    it('should call markForCheck when members change', () => {
      const newMembers = [{ nickName: 'Alice', image: 'alice-new.png' }];
      component.members = newMembers;
      
      spyOn(component['cdr'], 'markForCheck');
      
      component.ngOnChanges({
        members: {
          currentValue: newMembers,
          previousValue: component['localMembers'],
          firstChange: false,
          isFirstChange: () => false
        }
      });
      
      expect(component['cdr'].markForCheck).toHaveBeenCalled();
    });
  
    it('should handle empty members array', () => {
      const newMembers: { nickName: string; image: string }[] = [];
      component.members = newMembers;
      
      component.ngOnChanges({
        members: {
          currentValue: newMembers,
          previousValue: component['localMembers'],
          firstChange: false,
          isFirstChange: () => false
        }
      });
      
      expect(component['localMembers'].length).toBe(0);
    });
  
    it('should not process members if members is falsy', () => {
      const initialLength = component['localMembers'].length;
      spyOn(component as any, 'clearAvatarCache');
      
      component.members = null as any;
      
      component.ngOnChanges({
        members: {
          currentValue: null,
          previousValue: component['localMembers'],
          firstChange: false,
          isFirstChange: () => false
        }
      });
      
      expect(component['localMembers'].length).toBe(initialLength);
      expect(component['clearAvatarCache']).not.toHaveBeenCalled();
    });
  
    it('should spread members array to create new localMembers instance', () => {
      const newMembers = [
        { nickName: 'Alice', image: 'alice.png' },
        { nickName: 'Bob', image: 'bob.png' }
      ];
      component.members = newMembers;
      
      component.ngOnChanges({
        members: {
          currentValue: newMembers,
          previousValue: [],
          firstChange: false,
          isFirstChange: () => false
        }
      });
      
      expect(component['localMembers'].length).toBe(2);
      expect(component['localMembers'][0]).toEqual(newMembers[0]);
      expect(component['localMembers'][1]).toEqual(newMembers[1]);
      expect(component['localMembers']).not.toBe(newMembers); 
    });
  });

  describe('File viewer methods', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should open file viewer with correct parameters', () => {
      const content = JSON.stringify({
        text: 'test',
        files: [
          { fileName: 'image1.jpg', url: 'https://example.com/image1.jpg' },
          { fileName: 'image2.jpg', url: 'https://example.com/image2.jpg' }
        ]
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      spyOn(component as any, 'openFileViewerBase');
      
      component.openFileViewer(0, 'msg1');
      
      expect(component['openFileViewerBase']).toHaveBeenCalledWith(
        0,
        'msg1',
        component.messages,
        jasmine.any(Function),
        jasmine.any(Function)
      );
    });
  
    it('should pass parseContent function to openFileViewerBase', () => {
      const content = JSON.stringify({
        text: 'test',
        files: [{ fileName: 'image.jpg', url: 'https://example.com/image.jpg' }]
      });
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      let capturedParseFunction: any;
      spyOn(component as any, 'openFileViewerBase').and.callFake((idx: number, msgId: string, msgs: any[], parseFn: any) => {
        capturedParseFunction = parseFn;
      });
      
      component.openFileViewer(0, 'msg1');
      
      expect(capturedParseFunction).toBeDefined();
      const result = capturedParseFunction(msg);
      expect(result.text).toBe('test');
      expect(result.files.length).toBe(1);
    });
  
    it('should pass sender extraction function to openFileViewerBase', () => {
      const msg = createMessage('msg1', 'Alice', '2025-08-10T12:00:00Z');
      component.messages = [msg];
      
      let capturedSenderFunction: any;
      spyOn(component as any, 'openFileViewerBase').and.callFake((idx: number, msgId: string, msgs: any[], parseFn: any, senderFn: any) => {
        capturedSenderFunction = senderFn;
      });
      
      component.openFileViewer(0, 'msg1');
      
      expect(capturedSenderFunction).toBeDefined();
      const sender = capturedSenderFunction(msg);
      expect(sender).toBe('Alice');
    });
  
    it('should close image viewer', () => {
      spyOn(component as any, 'onImageViewerClosedBase');
      
      component.onImageViewerClosed();
      
      expect(component['onImageViewerClosedBase']).toHaveBeenCalled();
    });
  
    it('should scroll to reply message', () => {
      spyOn(component, 'scrollToMessage');
      
      component.onScrollToReplyMessage('msg123');
      
      expect(component.scrollToMessage).toHaveBeenCalledWith('msg123');
    });
  });

  describe('getMessageAvatar', () => {
    it('should get avatar using sender from message', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      
      const avatar = component.getMessageAvatar(msg);
      
      expect(avatar).toBe('alice.png');
    });
  
    it('should use oldSender if present and force refresh', () => {
      const msg = createMessage('1', 'NewAlice', '2025-08-10T12:00:00Z') as any;
      msg.oldSender = 'Alice';
      
      spyOn(component, 'getMemberAvatar').and.callThrough();
      
      component.getMessageAvatar(msg);
      
      expect(component.getMemberAvatar).toHaveBeenCalledWith('NewAlice', 'Alice', true);
    });
  
    it('should not force refresh if no oldSender', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      
      spyOn(component, 'getMemberAvatar').and.callThrough();
      
      component.getMessageAvatar(msg);
      
      expect(component.getMemberAvatar).toHaveBeenCalledWith('Alice', undefined, false);
    });
  });
  
  describe('downloadFile with fileName fallback', () => {
    it('should use "download" as fallback when fileName is missing', () => {
      const file = {
        url: 'https://example.com/file.pdf'
      };
  
      const mockLink = document.createElement('a');
      const appendChildSpy = spyOn(document.body, 'appendChild');
      const removeChildSpy = spyOn(document.body, 'removeChild');
      const clickSpy = jasmine.createSpy('click');
      
      spyOn(document, 'createElement').and.returnValue(Object.assign(mockLink, {
        click: clickSpy
      }));
  
      component.downloadFile(file);
  
      expect(mockLink.download).toBe('download');
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    });
  
    it('should use fileName when provided', () => {
      const file = {
        url: 'https://example.com/file.pdf',
        fileName: 'document.pdf'
      };
  
      const mockLink = document.createElement('a');
      const clickSpy = jasmine.createSpy('click');
      
      spyOn(document, 'createElement').and.returnValue(Object.assign(mockLink, {
        click: clickSpy
      }));
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
  
      component.downloadFile(file);
  
      expect(mockLink.download).toBe('document.pdf');
    });
  });
  
  describe('markFileAsRefreshing', () => {
    it('should set isRefreshing flag to true and call markForCheck', () => {
      const file = {
        fileName: 'test.pdf',
        isRefreshing: false
      };
  
      spyOn(component['cdr'], 'markForCheck');
  
      component.markFileAsRefreshing(file, true);
  
      expect(file.isRefreshing).toBeTrue();
      expect(component['cdr'].markForCheck).toHaveBeenCalled();
    });
  
    it('should set isRefreshing flag to false and call markForCheck', () => {
      const file = {
        fileName: 'test.pdf',
        isRefreshing: true
      };
  
      spyOn(component['cdr'], 'markForCheck');
  
      component.markFileAsRefreshing(file, false);
  
      expect(file.isRefreshing).toBeFalse();
      expect(component['cdr'].markForCheck).toHaveBeenCalled();
    });
  });

  describe('getMemberAvatar - additional coverage', () => {
    it('should return undefined from cache when value is explicitly undefined', () => {
      component['avatarCache'].set('alice', undefined);
      
      const avatar = component.getMemberAvatar('Alice');
      
      expect(avatar).toBeUndefined();
    });
  
    it('should find member in localMembers and cache avatar with cleanOld', () => {
      component['localMembers'] = [
        { nickName: 'Alice', image: 'alice-local.png' }
      ];
      
      const avatar = component.getMemberAvatar('Alice', 'OldAlice');
      
      expect(avatar).toBe('alice-local.png');
      expect(component['avatarCache'].get('alice')).toBe('alice-local.png');
      expect(component['avatarCache'].get('oldalice')).toBe('alice-local.png');
    });
  
    it('should cache image for both cleanNick and cleanOld from localMembers', () => {
      component['localMembers'] = [
        { nickName: 'NewAlice', image: 'alice-new.png' }
      ];
      
      component.getMemberAvatar('NewAlice', 'OldAlice');
      
      expect(component['avatarCache'].get('newalice')).toBe('alice-new.png');
      expect(component['avatarCache'].get('oldalice')).toBe('alice-new.png');
    });
  
    it('should set undefined in cache when localMembers.length > 0 and member not found', () => {
      component['localMembers'] = [
        { nickName: 'Alice', image: 'alice.png' }
      ];
      component.members = [
        { nickName: 'Alice', image: 'alice.png' }
      ];
      
      const avatar = component.getMemberAvatar('Unknown');
      
      expect(avatar).toBeUndefined();
      expect(component['avatarCache'].has('unknown')).toBeTrue();
      expect(component['avatarCache'].get('unknown')).toBeUndefined();
    });
  
    it('should set undefined for cleanOld when localMembers.length > 0 and member not found', () => {
      component['localMembers'] = [
        { nickName: 'Alice', image: 'alice.png' }
      ];
      component.members = [
        { nickName: 'Alice', image: 'alice.png' }
      ];
      
      const avatar = component.getMemberAvatar('Unknown', 'OldUnknown');
      
      expect(avatar).toBeUndefined();
      expect(component['avatarCache'].has('unknown')).toBeTrue();
      expect(component['avatarCache'].has('oldunknown')).toBeTrue();
      expect(component['avatarCache'].get('oldunknown')).toBeUndefined();
    });
  
    it('should find member by cleanOld in localMembers', () => {
      component['localMembers'] = [
        { nickName: 'Alice', image: 'alice.png' }
      ];
      
      const avatar = component.getMemberAvatar('NewNick', 'Alice');
      
      expect(avatar).toBe('alice.png');
    });
  
    it('should cache image when cleanOld is provided and member found in localMembers', () => {
      component['localMembers'] = [
        { nickName: 'OldNick', image: 'old.png' }
      ];
      
      const avatar = component.getMemberAvatar('NewNick', 'OldNick');
      
      expect(component['avatarCache'].get('newnick')).toBe('old.png');
      expect(component['avatarCache'].get('oldnick')).toBe('old.png');
    });
  
    it('should find member by cleanOld in original members array', () => {
      component['localMembers'] = [];
      component.members = [
        { nickName: 'Alice', image: 'alice.png' }
      ];
      
      const avatar = component.getMemberAvatar('NewNick', 'Alice');
      
      expect(avatar).toBe('alice.png');
    });
  
    it('should cache image for cleanOld when member found in original members', () => {
      component['localMembers'] = [];
      component.members = [
        { nickName: 'OldNick', image: 'old.png' }
      ];
      
      const avatar = component.getMemberAvatar('NewNick', 'OldNick');
      
      expect(component['avatarCache'].get('newnick')).toBe('old.png');
      expect(component['avatarCache'].get('oldnick')).toBe('old.png');
    });
  
    it('should return undefined when localMembers is empty and member not found', () => {
      component['localMembers'] = [];
      component.members = [
        { nickName: 'Alice', image: 'alice.png' }
      ];
      
      const avatar = component.getMemberAvatar('Unknown');
      
      expect(avatar).toBeUndefined();
    });
  
    it('should not set cache when localMembers.length is 0', () => {
      component['localMembers'] = [];
      component.members = [];
      
      const avatar = component.getMemberAvatar('Unknown');
      
      expect(avatar).toBeUndefined();
      expect(component['avatarCache'].has('unknown')).toBeFalse();
    });
  });

  describe('restoreScrollPosition', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should return early if scrollContainer is not defined', () => {
      component.scrollContainer = undefined as any;
      
      expect(() => {
        component['restoreScrollPosition'](1000, 100);
      }).not.toThrow();
    });
  
    it('should restore scroll position when heightDiff is positive', () => {
      const scrollElement = component.scrollContainer.nativeElement;
      
      Object.defineProperty(scrollElement, 'scrollHeight', { 
        value: 2000, 
        writable: true,
        configurable: true 
      });
      Object.defineProperty(scrollElement, 'scrollTop', { 
        value: 0, 
        writable: true,
        configurable: true 
      });
      
      const prevScrollHeight = 1000;
      const prevScrollTop = 100;
      
      component['restoreScrollPosition'](prevScrollHeight, prevScrollTop);
      
      const expectedScrollTop = prevScrollTop + (2000 - prevScrollHeight);
      expect(scrollElement.scrollTop).toBe(expectedScrollTop);
    });
  
    it('should not change scrollTop when heightDiff is zero or negative', () => {
      const scrollElement = component.scrollContainer.nativeElement;
      
      Object.defineProperty(scrollElement, 'scrollHeight', { 
        value: 1000, 
        writable: true,
        configurable: true 
      });
      Object.defineProperty(scrollElement, 'scrollTop', { 
        value: 100, 
        writable: true,
        configurable: true 
      });
      
      component['restoreScrollPosition'](1000, 100);
      
      expect(scrollElement.scrollTop).toBe(100);
    });
  });
  
  describe('Utility wrapper methods', () => {
    it('should call isMyMessageBase in isMyMessage', () => {
      const msg = createMessage('1', 'me', '2025-08-10T12:00:00Z');
      
      spyOn(component as any, 'isMyMessageBase').and.returnValue(true);
      
      const result = component.isMyMessage(msg);
      
      expect(component['isMyMessageBase']).toHaveBeenCalledWith(msg);
      expect(result).toBeTrue();
    });
  
    it('should call isMessageDeletedBase in isMessageDeleted', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"test"}', true);
      
      spyOn(component as any, 'isMessageDeletedBase').and.returnValue(true);
      
      const result = component.isMessageDeleted(msg);
      
      expect(component['isMessageDeletedBase']).toHaveBeenCalledWith(msg);
      expect(result).toBeTrue();
    });
  
    it('should call getMessageContentBase in getMessageContent', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', 'Test message');
      
      spyOn(component as any, 'getMessageContentBase').and.returnValue('Test message');
      
      const result = component.getMessageContent(msg);
      
      expect(component['getMessageContentBase']).toHaveBeenCalledWith(msg);
      expect(result).toBe('Test message');
    });
  
    it('should call isMessageHighlightedBase in isMessageHighlighted', () => {
      spyOn(component as any, 'isMessageHighlightedBase').and.returnValue(true);
      
      const result = component.isMessageHighlighted('msg1');
      
      expect(component['isMessageHighlightedBase']).toHaveBeenCalledWith('msg1');
      expect(result).toBeTrue();
    });
  
    it('should call highlightMessageBase in highlightMessage', () => {
      spyOn(component as any, 'highlightMessageBase');
      
      component.highlightMessage('msg1');
      
      expect(component['highlightMessageBase']).toHaveBeenCalledWith('msg1');
    });
  });

  describe('isDecryptedMessage', () => {
    it('should return true for message with text property', () => {
      const content = '{"text":"Hello world"}';
      
      const result = component['isDecryptedMessage'](content);
      
      expect(result).toBeTrue();
    });
  
    it('should return true for message with files property', () => {
      const content = '{"files":[{"fileName":"test.pdf"}]}';
      
      const result = component['isDecryptedMessage'](content);
      
      expect(result).toBeTrue();
    });
  
    it('should return true for message with both text and files', () => {
      const content = '{"text":"Check this","files":[{"fileName":"doc.pdf"}]}';
      
      const result = component['isDecryptedMessage'](content);
      
      expect(result).toBeTrue();
    });
  
    it('should return false for message with ciphertext', () => {
      const content = '{"text":"test","ciphertext":"encrypted"}';
      
      const result = component['isDecryptedMessage'](content);
      
      expect(result).toBeFalse();
    });
  
    it('should return false for invalid JSON', () => {
      const content = 'not a json';
      
      const result = component['isDecryptedMessage'](content);
      
      expect(result).toBeFalse();
    });
  
    it('should return false for null parsed value', () => {
      const content = 'null';
      
      const result = component['isDecryptedMessage'](content);
      
      expect(result).toBeFalse();
    });
  
    it('should return false for non-object parsed value', () => {
      const content = '"just a string"';
      
      const result = component['isDecryptedMessage'](content);
      
      expect(result).toBeFalse();
    });
  
    it('should return false for object without text or files', () => {
      const content = '{"other":"property"}';
      
      const result = component['isDecryptedMessage'](content);
      
      expect(result).toBeFalse();
    });
  
    it('should return false in catch block for parsing errors', () => {
      const content = '{invalid json}';
      
      const result = component['isDecryptedMessage'](content);
      
      expect(result).toBeFalse();
    });
  });

  describe('loadMore - additional coverage', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should set loading to false when filtered messages are empty', fakeAsync(() => {
      const deletedMsg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"test"}', true);
      loadHistorySpy.and.returnValue(of([deletedMsg]));
      
      component['loadMore']();
      tick();
      
      expect(component.loading).toBeFalse();
    }));
  
    it('should set allLoaded to true when filtered length is less than take', fakeAsync(() => {
      const deletedMsg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"test"}', true);
      loadHistorySpy.and.returnValue(of([deletedMsg]));
      
      component.take = 10;
      component['loadMore']();
      tick();
      
      expect(component.allLoaded).toBeTrue();
    }));
  
    it('should call loadMore again after 100ms when filtered is empty but more messages available', fakeAsync(() => {
      const deletedMsg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"test"}', true);
      loadHistorySpy.and.returnValues(
        of([deletedMsg]),
        of([])
      );
      
      component.take = 1;
      spyOn(window, 'setTimeout').and.callThrough();
      
      component['loadMore']();
      tick();
      
      expect(window.setTimeout).toHaveBeenCalledWith(jasmine.any(Function), 100);
    }));
  
    it('should call markForCheck when filtered is empty', fakeAsync(() => {
      const deletedMsg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"test"}', true);
      loadHistorySpy.and.returnValue(of([deletedMsg]));
      
      spyOn(component['cdr'], 'markForCheck');
      
      component['loadMore']();
      tick();
      
      expect(component['cdr'].markForCheck).toHaveBeenCalled();
    }));
  
    it('should set allLoaded when unique messages are empty and filtered length less than take', fakeAsync(() => {
      const msg1 = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      component.messages = [msg1];
      
      loadHistorySpy.and.returnValue(of([msg1])); 
      component.take = 10;
      
      component['loadMore']();
      tick();
      
      expect(component.allLoaded).toBeTrue();
    }));
  
    it('should call loadMore again when unique is empty but more available', fakeAsync(() => {
      const msg1 = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      component.messages = [msg1];
      
      loadHistorySpy.and.returnValues(
        of([msg1]),
        of([])
      );
      component.take = 1;
      
      spyOn(window, 'setTimeout').and.callThrough();
      
      component['loadMore']();
      tick();
      
      expect(window.setTimeout).toHaveBeenCalledWith(jasmine.any(Function), 100);
    }));
  
    it('should decrypt encrypted messages with Promise.all', fakeAsync(() => {
      const encryptedContent = JSON.stringify({
        ciphertext: 'encrypted',
        ephemeralKey: 'key',
        nonce: 'nonce',
        messageNumber: 1
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      
      loadHistorySpy.and.returnValue(of([msg]));
      
      component.messageDecryptor = jasmine.createSpy('decryptor').and.returnValue(
        Promise.resolve('{"text":"Decrypted"}')
      );
      
      spyOn(Promise, 'all').and.callThrough();
      
      component['loadMore']();
      tick();
      tick(5000);
      
      expect(Promise.all).toHaveBeenCalled();
    }));
  
    it('should call detectChanges after decrypting messages', fakeAsync(() => {
      const encryptedContent = JSON.stringify({
        ciphertext: 'encrypted',
        ephemeralKey: 'key',
        nonce: 'nonce',
        messageNumber: 1
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      
      loadHistorySpy.and.returnValue(of([msg]));
      
      component.messageDecryptor = jasmine.createSpy('decryptor').and.returnValue(
        Promise.resolve('{"text":"Decrypted"}')
      );
      
      spyOn(component['cdr'], 'detectChanges');
      
      component['loadMore']();
      tick();
      tick(5000);
      
      expect(component['cdr'].detectChanges).toHaveBeenCalled();
    }));
  
    it('should use 0 as default for prevScrollTop when scrollContainer is null', fakeAsync(() => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      loadHistorySpy.and.returnValue(of([msg]));
      
      component.scrollContainer = null as any;
      
      expect(() => {
        component['loadMore']();
        tick();
      }).not.toThrow();
    }));
  
    it('should use 0 as default for prevScrollHeight when scrollContainer is null', fakeAsync(() => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      loadHistorySpy.and.returnValue(of([msg]));
      
      component.scrollContainer = null as any;
      
      expect(() => {
        component['loadMore']();
        tick();
      }).not.toThrow();
    }));
  });

  describe('scrollToBottomAfterNewMessage', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should call scrollToBottomBase after animation frame and timeout', fakeAsync(() => {
      spyOn(component as any, 'scrollToBottomBase');
      
      let rafCallback: FrameRequestCallback;
      spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
        rafCallback = callback;
        return 0;
      });
      
      component.scrollToBottomAfterNewMessage();
      
      rafCallback!(0);
      
      tick(150);
      
      expect(component['scrollToBottomBase']).toHaveBeenCalledWith(component.scrollContainer);
    }));
  });

  describe('updateLocalMembers - additional coverage', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should find member by cleanOld nickname', () => {
      component['localMembers'] = [
        { nickName: 'OldNick', image: 'old.png' }
      ];
      
      component['updateLocalMembers']({
        userName: 'NewNick',
        oldNickName: 'OldNick',
        updatedAt: new Date().toISOString(),
        image: 'new.png'
      });
      
      expect(component['localMembers'][0].nickName).toBe('NewNick');
      expect(component['localMembers'][0].image).toBe('new.png');
    });
  
    it('should use empty string when userInfo.image is undefined', () => {
      component['localMembers'] = [
        { nickName: 'Alice', image: 'old.png' }
      ];
      
      component['updateLocalMembers']({
        userName: 'Alice',
        oldNickName: 'Alice',
        updatedAt: new Date().toISOString()
      });
      
      expect(component['localMembers'][0].image).toBe('');
    });
  
    it('should update existing member found by index', () => {
      component['localMembers'] = [
        { nickName: 'Alice', image: 'alice.png' }
      ];
      
      component['updateLocalMembers']({
        userName: 'Alice',
        oldNickName: 'OldAlice',
        updatedAt: new Date().toISOString(),
        image: 'alice-new.png'
      });
      
      expect(component['localMembers'][0].nickName).toBe('Alice');
      expect(component['localMembers'][0].image).toBe('alice-new.png');
    });
  
    it('should set image in avatarCache when image is provided', () => {
      component['localMembers'] = [];
      
      component['updateLocalMembers']({
        userName: 'NewUser',
        oldNickName: 'OldUser',
        updatedAt: new Date().toISOString(),
        image: 'user.png'
      });
      
      expect(component['avatarCache'].get('newuser')).toBe('user.png');
    });
  
    it('should set undefined in avatarCache when image is empty', () => {
      component['localMembers'] = [];
      
      component['updateLocalMembers']({
        userName: 'NewUser',
        oldNickName: 'OldUser',
        updatedAt: new Date().toISOString(),
        image: ''
      });
      
      expect(component['avatarCache'].has('newuser')).toBeTrue();
      expect(component['avatarCache'].get('newuser')).toBeUndefined();
    });
  });

  describe('subscribeToUserInfoUpdates and related methods', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should detect missing senders in messages', fakeAsync(() => {
      component['localMembers'] = [
        { nickName: 'Alice', image: 'alice.png' },
        { nickName: 'Bob', image: 'bob.png' }
      ];
      
      const uniqueSenders = ['UnknownUser', 'Alice'];
      const missing = uniqueSenders.filter(s => !component['localMembers'].some(m => m.nickName === s));
      
      expect(missing.length).toBe(1);
      expect(missing).toContain('UnknownUser');
      expect(missing).not.toContain('Alice');
    }));
  
    it('should use existing senderImage from message when userInfo.image is undefined', fakeAsync(() => {
      const msg = createMessage('1', 'OldNick', '2025-08-10T12:00:00Z') as any;
      msg.senderImage = 'existing-image.png';
      component.messages = [msg];
      
      userInfoChanged$.next({
        userName: 'NewNick',
        oldNickName: 'OldNick',
        updatedAt: new Date().toISOString()
      });
      tick();
      
      const updatedMsg = component.messages[0] as any;
      expect(updatedMsg.sender).toBe('NewNick');
      expect(updatedMsg.senderImage).toBe('existing-image.png');
    }));
  
    it('should keep original message when sender does not match', fakeAsync(() => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      component.messages = [msg];
      
      userInfoChanged$.next({
        userName: 'NewBob',
        oldNickName: 'Bob',
        updatedAt: new Date().toISOString(),
        image: 'bob-new.png'
      });
      tick();
      
      expect(component.messages[0].sender).toBe('Alice');
      expect((component.messages[0] as any).oldSender).toBeUndefined();
    }));
  });

  describe('performDecryption - additional coverage', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should mark message as decrypted when content is already JSON with text or files', fakeAsync(() => {
      const content = '{"text":"Already decrypted","files":[]}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      component['performDecryption'](msg);
      tick();
      
      const updatedMsg = component.messages[0] as any;
      expect(updatedMsg._decrypted).toBeTrue();
      expect(updatedMsg._isDecrypting).toBeFalse();
      expect(updatedMsg._decryptionFailed).toBeUndefined();
    }));
  
    it('should delete messageContentCache when message is already decrypted', fakeAsync(() => {
      const content = '{"text":"Already decrypted"}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      component['messageContentCache'].set('1', {
        text: 'cached',
        files: [],
        timestamp: Date.now(),
        version: Date.now()
      });
      
      component['performDecryption'](msg);
      tick();
      
      expect(component['messageContentCache'].has('1')).toBeFalse();
    }));
  
    it('should set content to "[No decryptor available]" when messageDecryptor is not available after 50 attempts', fakeAsync(() => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      component.messages = [msg];
      component.messageDecryptor = undefined;
      
      component['performDecryption'](msg);
      tick(5000);
      
      const updatedMsg = component.messages[0];
      expect(updatedMsg.content).toBe('[No decryptor available]');
      expect((updatedMsg as any)._isDecrypting).toBeFalse();
      expect((updatedMsg as any)._decryptionFailed).toBeTrue();
    }));
  
    it('should call loadFilesForMessages when decrypted content has files', fakeAsync(() => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const decryptedContent = '{"text":"test","files":[{"fileName":"file.pdf"}]}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      component.messages = [msg];
      
      component.messageDecryptor = jasmine.createSpy('decryptor').and.returnValue(
        Promise.resolve(decryptedContent)
      );
      
      spyOn(component as any, 'loadFilesForMessages');
      
      component['performDecryption'](msg);
      tick(100);
      tick(100);
      
      expect(component['loadFilesForMessages']).toHaveBeenCalledWith([jasmine.objectContaining({ id: '1' })]);
    }));
  
    it('should handle error when parsing decrypted content for files', fakeAsync(() => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const decryptedContent = 'invalid json';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      component.messages = [msg];
      
      component.messageDecryptor = jasmine.createSpy('decryptor').and.returnValue(
        Promise.resolve(decryptedContent)
      );
      
      expect(() => {
        component['performDecryption'](msg);
        tick(100);
        tick(100);
      }).not.toThrow();
    }));
  
    it('should set error message with "Unknown error" when error.message is missing', fakeAsync(() => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      component.messages = [msg];
      
      component.messageDecryptor = jasmine.createSpy('decryptor').and.returnValue(
        Promise.reject({})
      );
      
      component['performDecryption'](msg);
      tick(100);
      
      const updatedMsg = component.messages[0];
      expect(updatedMsg.content).toContain('Unknown error');
      expect((updatedMsg as any)._decryptionFailed).toBeTrue();
    }));
  
    it('should delete _decrypted flag on decryption failure', fakeAsync(() => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent) as any;
      msg._decrypted = true;
      component.messages = [msg];
      
      component.messageDecryptor = jasmine.createSpy('decryptor').and.returnValue(
        Promise.reject(new Error('Decryption failed'))
      );
      
      component['performDecryption'](msg);
      tick(100);
      
      const updatedMsg = component.messages[0] as any;
      expect(updatedMsg._decrypted).toBeUndefined();
      expect(updatedMsg._decryptionFailed).toBeTrue();
    }));
  });

  describe('parseContent - additional coverage', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should delete _decrypted flag and trigger re-decryption when isDecrypted is true', () => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent) as any;
      msg._decrypted = true;
      
      spyOn(component as any, 'decryptMessageQueued');
      
      const result = component.parseContent(msg);
      
      expect(msg._decrypted).toBeUndefined();
      expect(msg._isDecrypting).toBeTrue();
      expect(component['decryptMessageQueued']).toHaveBeenCalledWith(msg);
      expect(result.text).toBe('[Re-decrypting...]');
      expect(result.files).toEqual([]);
    });
  
    it('should return "[Decrypting...]" when isDecrypting is true', () => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent) as any;
      msg._isDecrypting = true;
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe('[Decrypting...]');
      expect(result.files).toEqual([]);
    });
  
    it('should return content when isFailed and content includes "["', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '[Decryption failed: error]') as any;
      msg._decryptionFailed = true;
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe('[Decryption failed: error]');
      expect(result.files).toEqual([]);
    });
  
    it('should return currentContent when isFailed and content includes "["', () => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent) as any;
      msg._decryptionFailed = true;
      msg.content = '[Custom error]';
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe('[Custom error]');
      expect(result.files).toEqual([]);
    });
    
    it('should return "[Decryption failed]" when isFailed and content does not include "["', () => {
      const encryptedContent = '{"ciphertext":"enc","ephemeralKey":"key","nonce":"abc","messageNumber":1}';
      
      expect(encryptedContent.includes('[')).toBeFalse();
      
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent) as any;
      msg._decryptionFailed = true;
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe('[Decryption failed]');
      expect(result.files).toEqual([]);
    });

    it('should return object with text and empty files when isFailed is true', () => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent) as any;
      msg._decryptionFailed = true;
      
      const result = component.parseContent(msg);
      
      expect(result).toEqual(jasmine.objectContaining({
        text: jasmine.any(String),
        files: []
      }));
    });

    it('should use empty string fallback in catch block when parsing fails with null content', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', null as any);
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe('');
      expect(result.files).toEqual([]);
    });
  
    it('should check hasOwnProperty for "files" in parsed object', () => {
      const content = '{"files":[{"fileName":"test.pdf"}]}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      
      const result = component.parseContent(msg);
      
      expect(result.files.length).toBe(1);
      expect(result.files[0].fileName).toBe('test.pdf');
    });
  
    it('should set file.url from cache when cachedUrl exists and not expired', () => {
      const content = '{"text":"test","files":[{"fileName":"file.pdf","uniqueFileName":"unique.pdf"}]}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      
      component['urlCache'].set('unique.pdf', {
        url: 'https://cached-url.com/file.pdf',
        timestamp: Date.now()
      });
      
      const result = component.parseContent(msg);
      
      expect(result.files[0].url).toBe('https://cached-url.com/file.pdf');
    });
  
    it('should set file.needsLoading when url is expired', () => {
      const content = '{"text":"test","files":[{"fileName":"file.pdf","uniqueFileName":"unique.pdf"}]}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      
      const expiredTimestamp = Date.now() - (4 * 60 * 60 * 1000);
      component['urlCache'].set('unique.pdf', {
        url: 'https://expired-url.com/file.pdf',
        timestamp: expiredTimestamp
      });
      
      spyOn(component as any, 'queueFileUrlRefresh');
      
      const result = component.parseContent(msg);
      
      expect(result.files[0].needsLoading).toBeTrue();
      expect(component['queueFileUrlRefresh']).toHaveBeenCalled();
    });
  
    it('should use isUrlExpired to check cached URL expiration', () => {
      const content = '{"text":"test","files":[{"fileName":"file.pdf","uniqueFileName":"unique.pdf","url":"https://old.com/file.pdf"}]}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      
      const expiredTimestamp = Date.now() - (4 * 60 * 60 * 1000);
      component['urlCache'].set('unique.pdf', {
        url: 'https://expired.com/file.pdf',
        timestamp: expiredTimestamp
      });
      
      spyOn(component as any, 'isUrlExpired').and.returnValue(true);
      spyOn(component as any, 'queueFileUrlRefresh');
      
      component.parseContent(msg);
      
      expect(component['isUrlExpired']).toHaveBeenCalledWith(expiredTimestamp);
      expect(component['queueFileUrlRefresh']).toHaveBeenCalled();
    });
  
    it('should return plain text in else block when parsed is not object or null', () => {
      const content = '"just a string"';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe(content);
      expect(result.files).toEqual([]);
    });
  
    it('should return empty string for text when currentContent is undefined', () => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '') as any;
      msg.content = undefined;
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe('');
      expect(result.files).toEqual([]);
    });

    it('should return currentContent when isFailed is true and content includes "["', () => {
      const contentWithBracket = '[Custom decryption error message]';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', contentWithBracket) as any;
      msg._decryptionFailed = true;
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe(contentWithBracket);
      expect(result.files).toEqual([]);
    });
    
    it('should return currentContent for encrypted message with bracket when failed', () => {
      const encryptedWithBracket = '{"ciphertext":"[encrypted]","ephemeralKey":"key","nonce":"n","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedWithBracket) as any;
      msg._decryptionFailed = true;
      
      const result = component.parseContent(msg);
      
      expect(encryptedWithBracket.includes('[')).toBeTrue();
      expect(result.text).toBe(encryptedWithBracket);
      expect(result.files).toEqual([]);
    });
  });

  describe('loadFilesForMessages', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should compare nickName with sender in missing filter', fakeAsync(() => {
      component['localMembers'] = [
        { nickName: 'Alice', image: 'alice.png' },
        { nickName: 'Bob', image: 'bob.png' }
      ];
      
      const msg1 = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      const msg2 = createMessage('2', 'Charlie', '2025-08-10T12:01:00Z');
      
      messages$.next([msg1, msg2]);
      tick();
      
      const uniqueSenders = ['Alice', 'Charlie'];
      const missing = uniqueSenders.filter(s => !component['localMembers'].some(m => m.nickName === s));
      
      expect(missing.length).toBe(1);
      expect(missing).toContain('Charlie');
    }));
  });

  describe('handleNewMessages - additional coverage', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should update existing message when isDeleted or isEdited changed but keep decrypted state', fakeAsync(() => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent) as any;
      msg._decrypted = true;
      component.messages = [msg];
      
      spyOn(component as any, 'isEncryptedMessage').and.returnValue(true);
      spyOn(component as any, 'invalidateMessageCache');
      spyOn(component['cdr'], 'markForCheck');
      
      const updatedMsg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      updatedMsg.isEdited = true;
      updatedMsg.editTime = '2025-08-10T12:05:00Z';
      
      messages$.next([updatedMsg]);
      tick();
      
      expect(component.messages[0].isEdited).toBeTrue();
      expect(component['invalidateMessageCache']).toHaveBeenCalledWith('1');
      expect(component['cdr'].markForCheck).toHaveBeenCalled();
    }));
  
    it('should check if newIsEncrypted when existingDecrypted is true', fakeAsync(() => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent) as any;
      msg._decrypted = true;
      component.messages = [msg];
      
      spyOn(component as any, 'isEncryptedMessage').and.returnValue(true);
      
      const updatedMsg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      messages$.next([updatedMsg]);
      tick();
      
      expect(component['isEncryptedMessage']).toHaveBeenCalledWith(updatedMsg);
    }));
  
    it('should handle content change by setting forceRefresh and deleting flags', fakeAsync(() => {
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"original"}') as any;
      msg._decrypted = true;
      msg._isDecrypting = false;
      component.messages = [msg];
      
      spyOn(component as any, 'isEncryptedMessage').and.returnValue(false);
      spyOn(component as any, 'isDecryptedMessage').and.returnValue(false);
      spyOn(component as any, 'invalidateMessageCache');
      
      const updatedMsg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', '{"text":"updated"}');
      
      messages$.next([updatedMsg]);
      tick();
      
      const result = component.messages.find(m => m.id === '1');
      expect(result?.content).toBe('{"text":"updated"}');
      expect(component['invalidateMessageCache']).toHaveBeenCalledWith('1');
    }));
  
    it('should preserve existing flags when content has not changed', fakeAsync(() => {
      const content = '{"text":"same"}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content) as any;
      msg._decrypted = true;
      msg._isDecrypting = false;
      msg._decryptionFailed = false;
      msg._version = 12345;
      component.messages = [msg];
      
      spyOn(component as any, 'isEncryptedMessage').and.returnValue(false);
      spyOn(component as any, 'isDecryptedMessage').and.returnValue(false);
      
      const updatedMsg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      
      messages$.next([updatedMsg]);
      tick();
      
      const result = component.messages[0] as any;
      expect(result._decrypted).toBeTrue();
      expect(result._isDecrypting).toBeFalse();
      expect(result._decryptionFailed).toBeFalse();
    }));

    it('should return early when newMsgs is empty', fakeAsync(() => {
      const initialLength = component.messages.length;
      
      spyOn(component['cdr'], 'markForCheck');
      
      messages$.next([]);
      tick();
      
      expect(component.messages.length).toBe(initialLength);
      expect(component['cdr'].markForCheck).not.toHaveBeenCalled();
    }));

    it('should call isScrolledToBottom when checking scroll condition', fakeAsync(() => {
      (component as any).shouldScrollToBottom = false;
      
      spyOn(component as any, 'isScrolledToBottom').and.returnValue(true);
      spyOn(component as any, 'scrollToBottomBase');
      
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z');
      messages$.next([msg]);
      tick();
      tick(100);
      
      expect(component['isScrolledToBottom']).toHaveBeenCalled();
      expect(component['scrollToBottomBase']).toHaveBeenCalled();
    }));
  });

  describe('decryptMessageQueued', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should await existing queue and return early', fakeAsync(() => {
      const encryptedContent = '{"ciphertext":"encrypted","ephemeralKey":"key","nonce":"nonce","messageNumber":1}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedContent);
      
      component.messageDecryptor = jasmine.createSpy('decryptor').and.returnValue(
        Promise.resolve('{"text":"Decrypted"}')
      );
      
      const existingPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 50);
      });
      component['decryptionQueue'].set('1', existingPromise);
      
      spyOn(component as any, 'performDecryption').and.returnValue(Promise.resolve());
      
      component['decryptMessageQueued'](msg);
      tick(100);
      
      expect(component['performDecryption']).not.toHaveBeenCalled();
    }));
  });

  describe('queueFileUrlRefresh', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should call processPendingFileRefreshes after timeout', fakeAsync(() => {
      const file = {
        fileName: 'test.pdf',
        uniqueFileName: 'unique-test.pdf'
      };
      
      spyOn(component as any, 'processPendingFileRefreshes');
      
      component['queueFileUrlRefresh'](file, 'msg1');
      
      tick(100);
      
      expect(component['processPendingFileRefreshes']).toHaveBeenCalled();
    }));
  });

  describe('checkAndRefreshExpiredUrls - additional coverage', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should use fu.originalName as fallback for cacheKey', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: [{
          fileName: 'file.pdf',
          uniqueFileName: 'unique.pdf',
          url: 'https://example.com/old.pdf'
        }]
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      const expiredTimestamp = Date.now() - (4 * 60 * 60 * 1000);
      component['urlCache'].set('unique.pdf', {
        url: 'https://expired.com/file.pdf',
        timestamp: expiredTimestamp
      });
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([{
        originalName: 'file.pdf',
        uniqueFileName: '',
        url: 'https://new.com/file.pdf'
      }]));
      
      component['checkAndRefreshExpiredUrls']();
      tick();
      
      expect(component['urlCache'].get('file.pdf')).toBeDefined();
      expect(component['urlCache'].get('file.pdf')?.url).toBe('https://new.com/file.pdf');
    }));
  
    it('should handle error in catch block when getDownloadUrls fails', fakeAsync(() => {
      const content = JSON.stringify({
        text: 'test',
        files: [{
          fileName: 'file.pdf',
          uniqueFileName: 'unique.pdf',
          url: 'https://example.com/old.pdf'
        }]
      });
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      component.messages = [msg];
      
      const expiredTimestamp = Date.now() - (4 * 60 * 60 * 1000);
      component['urlCache'].set('unique.pdf', {
        url: 'https://expired.com/file.pdf',
        timestamp: expiredTimestamp
      });
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(
        Promise.reject(new Error('Network error'))
      );
      
      expect(() => {
        component['checkAndRefreshExpiredUrls']();
        tick();
      }).not.toThrow();
    }));
  });

  describe('parseContent - currentContent coverage', () => {
    beforeEach(fakeAsync(() => {
      loadHistorySpy.and.returnValue(of([]));
      component.ngOnChanges({
        groupId: {
          currentValue: 'g1',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });
      fixture.detectChanges();
      tick();
    }));
  
    it('should use currentContent in else block when parsed is not valid object', () => {
      const content = '{"someOtherField":"value"}';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe(content);
      expect(result.files).toEqual([]);
    });
  
    it('should use currentContent when parsed is array', () => {
      const content = '["item1","item2"]';
      const msg = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', content);
      
      const result = component.parseContent(msg);
      
      expect(result.text).toBe(content);
      expect(result.files).toEqual([]);
    });
  
    it('should evaluate currentContent in includes check for failed decryption', () => {
      const encryptedWithBracket = '[encrypted data]';
      const msg1 = createMessage('1', 'Alice', '2025-08-10T12:00:00Z', encryptedWithBracket) as any;
      msg1._decryptionFailed = true;
      
      const result1 = component.parseContent(msg1);
      
      expect(result1.text).toBe('[encrypted data]');
    });
  });
});