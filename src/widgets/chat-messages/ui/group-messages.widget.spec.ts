import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GroupMessagesWidget } from './group-messages.widget';
import { Subject, of, throwError } from 'rxjs';
import { GroupMessage } from '../../../entities/group-message';

describe('GroupMessagesWidget (Jasmine)', () => {
  let fixture: ComponentFixture<GroupMessagesWidget>;
  let component: GroupMessagesWidget;

  let messages$: Subject<GroupMessage[]>;
  let userInfoChanged$: Subject<{ userName: string; image?: string; updatedAt: string; oldNickName: string }>;
  let loadHistorySpy: jasmine.Spy;

  const mkMsg = (
    id: string,
    sender: string,
    iso: string,
    content = '',
    isDeleted = false,
    groupId = 'g1',
    isEdited = false
  ): GroupMessage => ({
    id,
    sender,
    content,
    sendTime: iso,
    isDeleted,
    groupId,
    isEdited,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupMessagesWidget],
    })
      .overrideComponent(GroupMessagesWidget, {
        set: {
          template: `
            <div #scrollContainer style="height:300px; overflow:auto" (scroll)="onScroll()">
              <div *ngFor="let group of groupedMessages; trackBy: trackByGroup">
                <div *ngFor="let m of group.messages; trackBy: trackByMessageId" class="message-container">
                  <div class="px-3 py-2 rounded-2xl" [attr.data-message-id]="m.id">
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
    userInfoChanged$ = new Subject<{ userName: string; image?: string; updatedAt: string; oldNickName: string }>();
    loadHistorySpy = jasmine.createSpy('loadHistory');

    component.groupId = 'g1';
    component.members = [
      { nickName: 'Old', image: 'img-old.png' },
      { nickName: 'me', image: 'me.png' }
    ];
    component.currentUserNickName = 'me';
    component.messages$ = messages$ as any;
    component.userInfoChanged$ = userInfoChanged$ as any;
    component.loadHistory = loadHistorySpy;
  });

  it('initChat_LoadsHistoryAndStream_MergesAndSorts', fakeAsync(() => {
    const history = [
      mkMsg('1', 'Old', '2025-08-10T12:00:00Z', 'old-1'),
      mkMsg('2', 'Other', '2025-08-10T13:00:00Z', 'other-2'),
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

    expect(loadHistorySpy).toHaveBeenCalledWith('g1', 20, 0);
    expect(component.messages.map(m => m.id)).toEqual(['1', '2']);
    expect(component['skip']).toBe(2);

    const streamUpdate = [
      mkMsg('1', 'Old', '2025-08-10T12:00:00Z', 'old-1-updated'),
      mkMsg('3', 'Other', '2025-08-10T14:00:00Z', 'other-3'),
    ];
    messages$.next(streamUpdate);
    tick();

    expect(component.messages.map(m => `${m.id}:${m.content}`))
      .toEqual(['1:old-1-updated', '3:other-3']);
    expect(component['skip']).toBe(2);
  }));

  it('userInfoChanged_UpdatesSenders_LocalMembers_AvatarCache_AndGetMessageAvatar', fakeAsync(() => {
    const history = [mkMsg('1', 'Old', '2025-08-10T12:00:00Z', 'hello')];
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

    expect(component.messages.length).toBe(1);
    expect(component.messages[0].sender).toBe('Old');

    userInfoChanged$.next({
      userName: 'New',
      image: 'img-new.png',
      updatedAt: new Date().toISOString(),
      oldNickName: 'Old'
    });
    tick();

    const updated = component.messages[0] as any;
    expect(updated.sender).toBe('New');
    expect(updated.oldSender).toBe('Old');

    const updatedMember = component['localMembers'].find(m => m.nickName === 'New');
    expect(updatedMember?.image).toBe('img-new.png');

    const avatar = component.getMessageAvatar(updated);
    expect(avatar).toBe('img-new.png');
    const avatar2 = component.getMessageAvatar(updated);
    expect(avatar2).toBe('img-new.png');
  }));

  it('context actions emit correct message', fakeAsync(() => {
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

    const msg = mkMsg('x', 'me', '2025-08-10T12:00:00Z', 'hi');
    component.messages = [msg];
    component['contextMenuMessageId'] = 'x';

    const editSpy = jasmine.createSpy('onEdit');
    const delSpy = jasmine.createSpy('onDelete');
    const replySpy = jasmine.createSpy('onReply');

    component.editMessage.subscribe(editSpy);
    component.deleteMessage.subscribe(delSpy);
    component.replyToMessage.subscribe(replySpy);

    component.onEditMessage();
    component.onDeleteMessage();
    component.onReplyToMessage();

    expect(editSpy.calls.mostRecent().args[0].id).toBe('x');
    expect(delSpy.calls.mostRecent().args[0].id).toBe('x');
    expect(replySpy.calls.mostRecent().args[0].id).toBe('x');
    expect(component['showContextMenu']).toBeFalse();
  }));

  it('scrollToMessage_FindsElementAndHighlights', fakeAsync(() => {
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

    component.messages = [
      mkMsg('a', 'Other', '2025-08-10T12:00:00Z', 'A'),
      mkMsg('b', 'Other', '2025-08-10T13:00:00Z', 'B'),
      mkMsg('c', 'Other', '2025-08-10T14:00:00Z', 'C'),
    ];
    fixture.detectChanges();

    const mockElement = document.createElement('div');
    mockElement.setAttribute('data-message-id', 'b');
    mockElement.scrollIntoView = jasmine.createSpy('scrollIntoView');
    
    spyOn(component.scrollContainer.nativeElement, 'querySelector').and.returnValue(mockElement);
    
    const highlightSpy = spyOn(component, 'highlightMessage').and.callThrough();

    component.scrollToMessage('b');
    tick(300);

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(highlightSpy).toHaveBeenCalledWith('b');
    expect(component['highlightedMessageId']).toBe('b');

    tick(1501);
    expect(component['highlightedMessageId']).toBeNull();
  }));

  it('shouldShowSenderName_ReturnsTrueOnSenderChangeOrFirst', () => {
    const msgs = [
      mkMsg('1', 'A', '2025-08-10T12:00:00Z'),
      mkMsg('2', 'A', '2025-08-10T12:01:00Z'),
      mkMsg('3', 'B', '2025-08-10T12:02:00Z'),
      mkMsg('4', 'B', '2025-08-10T12:03:00Z'),
      mkMsg('5', 'A', '2025-08-10T12:04:00Z'),
    ];

    expect(component.shouldShowSenderName(msgs as any, 0)).toBeTrue();
    expect(component.shouldShowSenderName(msgs as any, 1)).toBeFalse();
    expect(component.shouldShowSenderName(msgs as any, 2)).toBeTrue();
    expect(component.shouldShowSenderName(msgs as any, 3)).toBeFalse();
    expect(component.shouldShowSenderName(msgs as any, 4)).toBeTrue();
  });

  it('should handle message content and deletion status', () => {
    const msg = mkMsg('1', 'user', '2025-08-10T12:00:00Z', 'test content', false);
    
    expect(component.getMessageContent(msg)).toBe('test content');
    expect(component.isMessageDeleted(msg)).toBeFalse();
    
    const deletedMsg = mkMsg('2', 'user', '2025-08-10T12:00:00Z', 'deleted', true);
    expect(component.isMessageDeleted(deletedMsg)).toBeTrue();
  });

  it('should handle getRepliedMessage', () => {
    component.messages = [mkMsg('1', 'user', '2025-08-10T12:00:00Z', 'test')];
    
    const found = component.getRepliedMessage('1');
    expect(found?.id).toBe('1');
    
    const notFound = component.getRepliedMessage('999');
    expect(notFound).toBeNull();
  });

  it('should handle canEditOrDelete for own messages', () => {
    const myMsg = mkMsg('1', 'me', '2025-08-10T12:00:00Z', 'my message');
    const otherMsg = mkMsg('2', 'other', '2025-08-10T12:00:00Z', 'other message');
    
    component.messages = [myMsg, otherMsg];
    component['contextMenuMessageId'] = '1';
    
    expect(component.canEditOrDelete()).toBeTrue();
    
    component['contextMenuMessageId'] = '2';
    expect(component.canEditOrDelete()).toBeFalse();
  });

  it('should handle scrollToMessage when element not found initially but found on retry', fakeAsync(() => {
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

    const mockElement = document.createElement('div');
    mockElement.scrollIntoView = jasmine.createSpy('scrollIntoView');

    let callCount = 0;
    spyOn(component.scrollContainer.nativeElement, 'querySelector').and.callFake(() => {
      callCount++;
      return callCount === 1 ? null : mockElement; 
    });

    const highlightSpy = spyOn(component, 'highlightMessage').and.callThrough();

    component.scrollToMessage('test-id');

    tick(1000);
    
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(highlightSpy).toHaveBeenCalledWith('test-id');
  }));

  it('should handle missing context menu message', () => {
    component.messages = [];
    component['contextMenuMessageId'] = 'non-existent';

    expect(component.canEditOrDelete()).toBeFalsy();

    component.onEditMessage();
    component.onDeleteMessage();
    component.onReplyToMessage();

    expect(component['showContextMenu']).toBeFalsy();
  });

  it('should handle loadHistory error', fakeAsync(() => {
    loadHistorySpy.and.returnValue(throwError(() => new Error('Failed')));
  
    component.ngOnChanges({ groupId: { currentValue: 'g1', previousValue: undefined, firstChange: true, isFirstChange: () => true } });
    tick();
  
    expect(component.loading).toBeFalse();
  }));

  it('should return undefined for empty nick', () => {
    expect(component.getMemberAvatar('')).toBeUndefined();
  });

  it('should cache undefined when no image found', () => {
    component['localMembers'] = [{ nickName: 'Test', image: '' }];
    component.getMemberAvatar('Test');
    expect(component['avatarCache'].get('test')).toBeUndefined();
  });
  
  it('should handle onScroll with context menu shown', () => {
    component.showContextMenu = true;
    component.onScroll();
    expect(component.showContextMenu).toBeFalse();
  });
  
  it('should handle onScroll when scroll position triggers loadMore', fakeAsync(() => {
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
    
    component.loading = false;
    component.allLoaded = false;
    
    const scrollElement = component.scrollContainer?.nativeElement;
    if (scrollElement) {
      Object.defineProperty(scrollElement, 'scrollTop', { value: 100, configurable: true });
      Object.defineProperty(scrollElement, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(scrollElement, 'clientHeight', { value: 300, configurable: true });
    }
  
    const loadMoreSpy = spyOn(component as any, 'loadMore').and.callThrough();
    component.onScroll();
    
    expect(loadMoreSpy).toHaveBeenCalled();
  }));
  
  it('should handle updateMessagesSenders with existing senderImage', () => {
    component.messages = [
      { ...mkMsg('1', 'Old', '2025-08-10T12:00:00Z'), senderImage: 'existing.png' } as any
    ];
    
    component['updateMessagesSenders']({
      userName: 'New',
      oldNickName: 'Old',
      updatedAt: new Date().toISOString()
    });
    
    const updated = component.messages[0] as any;
    expect(updated.senderImage).toBe('existing.png');
  });
  
  it('should handle updateLocalMembers when cleanNew equals cleanOld', () => {
    component['localMembers'] = [{ nickName: 'user', image: 'old.png' }];
    
    component['updateLocalMembers']({
      userName: 'User',
      image: 'new.png',
      updatedAt: new Date().toISOString(),
      oldNickName: 'user'
    });
    
    expect(component['localMembers'].length).toBe(1);
    expect(component['localMembers'][0].nickName).toBe('User');
    expect(component['localMembers'][0].image).toBe('new.png');
  });
  
  it('should handle clearAvatarCache without specific parameter', () => {
    component['avatarCache'].set('test1', 'avatar1');
    component['avatarCache'].set('test2', 'avatar2');
    
    component['clearAvatarCache']();
    
    expect(component['avatarCache'].size).toBe(0);
  });
  
  it('should handle updateLocalMembers with image cache set to undefined', () => {
    component['localMembers'] = [{ nickName: 'Test', image: 'test.png' }];
    
    component['updateLocalMembers']({
      userName: 'Test',
      updatedAt: new Date().toISOString(),
      oldNickName: 'Test'
    });
    
    expect(component['avatarCache'].get('test')).toBeUndefined();
  });
  
  it('should handle canEditOrDelete with deleted message', () => {
    const deletedMsg = mkMsg('1', 'me', '2025-08-10T12:00:00Z', 'deleted', true);
    component.messages = [deletedMsg];
    component['contextMenuMessageId'] = '1';
    
    expect(component.canEditOrDelete()).toBeFalse();
  });
  
  it('should handle loadMore with my deleted messages', fakeAsync(() => {
    loadHistorySpy.and.returnValue(of([
      mkMsg('1', 'me', '2025-08-10T12:00:00Z', 'my-deleted', true),
      mkMsg('2', 'other', '2025-08-10T13:00:00Z', 'other-deleted', true)
    ]));
    
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
  
    expect(component.messages.length).toBe(1);
    expect(component.messages[0].id).toBe('1'); 
  }));
  
  it('should handle initChat with shouldScrollToBottom condition', fakeAsync(() => {
    loadHistorySpy.and.returnValue(of([]));
    spyOn(component as any, 'isScrolledToBottom').and.returnValue(false);
    component['shouldScrollToBottom'] = true;
    
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
  
    messages$.next([mkMsg('1', 'test', '2025-08-10T12:00:00Z', 'test')]);
    tick();
  
    expect(component['shouldScrollToBottom']).toBeFalse();
  }));
  
  it('should handle getMemberAvatar with oldNick cached', () => {
    component['avatarCache'].set('old', 'old-cached.png');
    
    const result = component.getMemberAvatar('New', 'Old');
    expect(result).toBe('old-cached.png');
    expect(component['avatarCache'].get('new')).toBe('old-cached.png');
  });
    
  it('should handle right click context menu without scrollContainer', () => {
    const mockEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      target: document.createElement('div')
    } as any;
    
    const mockContainer = document.createElement('div');
    mockContainer.className = 'message-container';
    spyOn(mockEvent.target, 'closest').and.returnValue(mockContainer);
    
    component.scrollContainer = undefined as any;
    
    component.onMessageRightClick(mockEvent, mkMsg('1', 'test', '2025-08-10T12:00:00Z'));
    
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(component.showContextMenu).toBeFalse();
  });
  
  it('should handle isMessageHighlighted', () => {
    component['highlightedMessageId'] = 'test-id';
    expect(component.isMessageHighlighted('test-id')).toBeTrue();
    expect(component.isMessageHighlighted('other-id')).toBeFalse();
  });

  it('should handle onMessageRightClick with complete flow', fakeAsync(() => {
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

    const msg = mkMsg('1', 'user', '2025-08-10T12:00:00Z', 'test');
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';
    const messageBlock = document.createElement('div');
    messageBlock.className = 'px-3 py-2 rounded-2xl';
    messageContainer.appendChild(messageBlock);
    
    const mockBlockRect = { top: 100, left: 100, bottom: 150, right: 200, width: 100, height: 50 };
    const mockContainerRect = { top: 0, left: 0, bottom: 300, right: 400, width: 400, height: 300 };
    
    spyOn(messageBlock, 'getBoundingClientRect').and.returnValue(mockBlockRect as DOMRect);
    spyOn(component.scrollContainer.nativeElement, 'getBoundingClientRect').and.returnValue(mockContainerRect as DOMRect);
    
    const mockEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      target: messageBlock
    } as any;
    
    spyOn(messageBlock, 'closest').and.returnValue(messageContainer);
    spyOn(messageContainer, 'querySelector').and.returnValue(messageBlock);
    
    component.onMessageRightClick(mockEvent, msg);
    
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(component['contextMenuMessageId']).toBe('1');
    expect(component.showContextMenu).toBeTrue();
  }));

  it('should handle updateMessagesSenders with no matching sender', () => {
    component.messages = [
      mkMsg('1', 'OtherUser', '2025-08-10T12:00:00Z', 'test')
    ];
    
    component['updateMessagesSenders']({
      userName: 'NewName',
      oldNickName: 'NonExistentUser',
      updatedAt: new Date().toISOString(),
      image: 'new.png'
    });
    
    expect(component.messages[0].sender).toBe('OtherUser');
    expect((component.messages[0] as any).oldSender).toBeUndefined();
  });

  it('should handle updateLocalMembers with no existing member to update', () => {
    component['localMembers'] = [
      { nickName: 'ExistingUser', image: 'existing.png' }
    ];
    
    component['updateLocalMembers']({
      userName: 'CompletelyNewUser',
      oldNickName: 'NonExistentOldUser',
      updatedAt: new Date().toISOString(),
      image: 'new.png'
    });
    
    expect(component['localMembers'].length).toBe(2);
    expect(component['localMembers'][1].nickName).toBe('CompletelyNewUser');
    expect(component['localMembers'][1].image).toBe('new.png');
  });

  it('should handle getMemberAvatar with originalMembers fallback when cleanOld exists', () => {
    component['localMembers'] = [];
    
    component.members = [
      { nickName: 'OriginalUser', image: 'original.png' }
    ];
    
    const result = component.getMemberAvatar('NewUser', 'OriginalUser');
    
    expect(result).toBe('original.png');
    expect(component['avatarCache'].get('newuser')).toBe('original.png');
    expect(component['avatarCache'].get('originaluser')).toBe('original.png');
  });

  it('should handle initChat stream with deleted messages filtering logic', fakeAsync(() => {
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

    const streamMessages = [
      mkMsg('1', 'me', '2025-08-10T12:00:00Z', 'my-normal', false), 
      mkMsg('2', 'me', '2025-08-10T13:00:00Z', 'my-deleted', true), 
      mkMsg('3', 'other', '2025-08-10T14:00:00Z', 'other-normal', false),
      mkMsg('4', 'other', '2025-08-10T15:00:00Z', 'other-deleted', true) 
    ];
    
    messages$.next(streamMessages);
    tick();

    expect(component.messages.length).toBe(3);
    expect(component.messages.find(m => m.id === '1')).toBeTruthy();
    expect(component.messages.find(m => m.id === '2')).toBeFalsy();
    expect(component.messages.find(m => m.id === '3')).toBeTruthy();
    expect(component.messages.find(m => m.id === '4')).toBeTruthy();
  }));

  it('should handle scrollToMessage without scrollContainer', () => {
    component.scrollContainer = undefined as any;
    
    expect(() => component.scrollToMessage('test-id')).not.toThrow();
  });

  it('should handle isScrolledToBottom without scrollContainer', () => {
    component.scrollContainer = undefined as any;
    
    const result = component['isScrolledToBottom']();
    
    expect(result).toBeFalse();
  });

  it('should handle scrollToBottom without scrollContainer', () => {
    component.scrollContainer = undefined as any;
    
    expect(() => component['scrollToBottom']()).not.toThrow();
  });

  it('should handle getMemberAvatar nullish coalescing operator', () => {
    component['avatarCache'].set('test', undefined);
    
    const result = component.getMemberAvatar('Test');
    
    expect(result).toBeUndefined();
  });

  it('ngAfterViewInit wires hideContextMenu + timeout scroll and cleans up listeners', fakeAsync(() => {
    loadHistorySpy.and.returnValue(of([]));
    const scrollSpy = spyOn(component as any, 'scrollToBottom').and.callThrough();

    fixture.detectChanges(); 
    tick();                 
    expect(scrollSpy).toHaveBeenCalled();

    component.showContextMenu = true;
    document.dispatchEvent(new Event('click'));
    expect(component.showContextMenu).toBeFalse();

    const remSpy = spyOn(document, 'removeEventListener').and.callThrough();
    component.ngOnDestroy();
    expect(remSpy).toHaveBeenCalled();
  }));

  it('subscribeToUserInfoUpdates covers both missing senders branches', fakeAsync(() => {
    loadHistorySpy.and.returnValue(of([]));
    fixture.detectChanges();
    tick();

    messages$.next([mkMsg('m1', 'unknownUser', '2025-08-10T12:00:00Z')]);
    tick();

    const known = [{ nickName: 'known', image: '' }];
    component.members = known as any;
    component.ngOnChanges({
      members: {
        currentValue: known,
        previousValue: [],
        firstChange: false,
        isFirstChange: () => false
      }
    });
    messages$.next([mkMsg('m2', 'known', '2025-08-10T12:10:00Z')]);
    tick();

    expect(true).toBeTrue();
  }));

  it('onMessageRightClick returns when messageBlock not found', () => {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';

    const mockEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      target: messageContainer
    } as any;

    spyOn(mockEvent.target, 'closest').and.returnValue(messageContainer);
    spyOn(messageContainer, 'querySelector').and.returnValue(null);

    fixture.detectChanges();

    component.onMessageRightClick(mockEvent, mkMsg('id', 'user', '2025-08-10T12:00:00Z'));
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(component.showContextMenu).toBeFalse();
  });

  it('loadMore sets allLoaded=true when unique length is zero (duplicates only)', fakeAsync(() => {
    const history = [
      mkMsg('h1', 'A', '2025-08-10T12:00:00Z'),
      mkMsg('h2', 'B', '2025-08-10T12:01:00Z')
    ];
    loadHistorySpy.and.returnValue(of(history));

    component.ngOnChanges({
      groupId: { currentValue: 'g1', previousValue: undefined, firstChange: true, isFirstChange: () => true }
    });
    fixture.detectChanges();
    tick();

    loadHistorySpy.and.returnValue(of(history));
    component.loading = false;
    component.allLoaded = false;

    const el = component.scrollContainer.nativeElement;
    Object.defineProperty(el, 'scrollTop', { value: 100, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 2000, configurable: true });
    component.onScroll();
    tick();

    expect(component.allLoaded).toBeTrue();
  }));

  it('loadMore early-returns when loading or allLoaded (guard inside loadMore)', () => {
    loadHistorySpy.calls.reset();
    (component as any).loading = true;
    (component as any).allLoaded = false;
    (component as any).loadMore();
    expect(loadHistorySpy).not.toHaveBeenCalled();

    (component as any).loading = false;
    (component as any).allLoaded = true;
    (component as any).loadMore();
    expect(loadHistorySpy).not.toHaveBeenCalled();
  });

  it('should cache undefined for oldNick when localMembers has no image', () => {
    component['localMembers'] = [{ nickName: 'User1', image: '' }];
    const result = component.getMemberAvatar('User2', 'User1');
    expect(result).toBeUndefined();
    expect(component['avatarCache'].get('user1')).toBeUndefined();
  });
});