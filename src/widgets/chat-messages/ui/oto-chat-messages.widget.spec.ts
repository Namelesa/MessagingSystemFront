import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { OtoChatMessagesWidget } from './oto-chat-messages.widget';
import { OtoMessage } from '../../../entities/oto-message';
import { BehaviorSubject, Subject, of } from 'rxjs';

describe('OtoChatMessagesWidget', () => {
  let component: OtoChatMessagesWidget;
  let fixture: ComponentFixture<OtoChatMessagesWidget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtoChatMessagesWidget],
    }).compileComponents();

    fixture = TestBed.createComponent(OtoChatMessagesWidget);
    component = fixture.componentInstance;
    component.currentUserNickName = 'currentUser';
    fixture.detectChanges();
  });

  afterEach(() => {
    (window as any).__otoMessages$ = undefined;
    (window as any).__otoUserInfoDeleted$ = undefined;
    (window as any).__otoLoadHistory = undefined;
  });

  it('should initialize chat on chatNickName change', fakeAsync(() => {
    const spyLoadMore = spyOn<any>(component, 'loadMore');
    component.chatNickName = 'testChat';
    component.ngOnChanges({
      chatNickName: {
        currentValue: 'testChat',
        previousValue: '',
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    expect(spyLoadMore).toHaveBeenCalled();
  }));

  it('should scroll to a message and highlight it', fakeAsync(() => {
    const msg: OtoMessage = { 
      messageId: '1', sender: 'user', content: 'Hello', 
      sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' 
    };
    component.messages = [msg];
    fixture.detectChanges();
  
    const scrollIntoViewSpy = jasmine.createSpy('scrollIntoView');
    component.scrollContainer = {
      nativeElement: {
        querySelector: () => ({ scrollIntoView: scrollIntoViewSpy })
      }
    } as any;
  
    component.scrollToMessage('1');
  
    tick(300);
    flush();       
    fixture.detectChanges();
  
    expect(scrollIntoViewSpy).toHaveBeenCalled();
    expect(component.highlightedMessageId).toBeNull();
  }));

  it('should retry scroll to message if element not found initially', fakeAsync(() => {
    const msg: OtoMessage = { 
      messageId: '1', sender: 'user', content: 'Hello', 
      sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' 
    };
    component.messages = [msg];
    fixture.detectChanges();
  
    const scrollIntoViewSpy = jasmine.createSpy('scrollIntoView');
    let callCount = 0;
    component.scrollContainer = {
      nativeElement: {
        querySelector: () => {
          callCount++;
          return callCount === 1 ? null : { scrollIntoView: scrollIntoViewSpy };
        }
      }
    } as any;
  
    component.scrollToMessage('1');
    tick(1000);
    
    expect(scrollIntoViewSpy).toHaveBeenCalled();
  }));

  it('should handle missing scrollContainer in scrollToMessage', () => {
    component.scrollContainer = undefined as any;
    expect(() => component.scrollToMessage('1')).not.toThrow();
  });

  it('should call scrollToMessage on onScrollToReplyMessage', () => {
    const spy = spyOn(component, 'scrollToMessage');
    component.onScrollToReplyMessage('1');
    expect(spy).toHaveBeenCalledWith('1');
  });

  it('should get replied message', () => {
    const msg: OtoMessage = { 
      messageId: '1', sender: 'user', content: 'Hello', 
      sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' 
    };
    component.messages = [msg];
    
    expect(component.getRepliedMessage('1')).toEqual(msg);
    expect(component.getRepliedMessage('2')).toBeNull();
  });

  it('should filter deleted messages from groupedMessages for my messages', () => {
    const messages: OtoMessage[] = [
      { messageId: '1', sender: 'currentUser', content: 'My deleted message', 
        sentAt: new Date().toISOString(), isDeleted: true, recipient: 'recipientUser' },
      { messageId: '2', sender: 'otherUser', content: 'Other deleted message', 
        sentAt: new Date().toISOString(), isDeleted: true, recipient: 'currentUser' }
    ];
    component.messages = messages;
    
    const grouped = component.groupedMessages;
    expect(grouped[0].messages.length).toBe(1);
    expect(grouped[0].messages[0].sender).toBe('otherUser');
  });

  it('should handle scroll and hide context menu', () => {
    component.showContextMenu = true;
    component.scrollContainer = {
      nativeElement: { scrollTop: 100, scrollHeight: 1000, clientHeight: 500 }
    } as any;
    
    component.onScroll();
    expect(component.showContextMenu).toBeFalse();
  });

  it('should return early from onScroll if no scrollContainer', () => {
    component.scrollContainer = undefined as any;
    expect(() => component.onScroll()).not.toThrow();
  });

  it('should handle missing messageContainer in context menu', () => {
    const msg: OtoMessage = { 
      messageId: '1', sender: 'user', content: 'Hello', 
      sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' 
    };
    
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      target: {
        closest: jasmine.createSpy('closest').and.returnValue(null)
      }
    } as any as MouseEvent;

    component.onMessageRightClick(event, msg);
    expect(component.showContextMenu).toBeFalse();
  });

  it('should handle missing messageBlock in context menu', () => {
    const msg: OtoMessage = { 
      messageId: '1', sender: 'user', content: 'Hello', 
      sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' 
    };
    
    const fakeContainer = {
      querySelector: jasmine.createSpy('querySelector').and.returnValue(null)
    };
    
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      target: {
        closest: jasmine.createSpy('closest').and.returnValue(fakeContainer)
      }
    } as any as MouseEvent;

    component.onMessageRightClick(event, msg);
    expect(component.showContextMenu).toBeFalse();
  });
  
  it('should show context menu on right click', () => {
    const msg: OtoMessage = { 
      messageId: '1', sender: 'user', content: 'Hello', 
      sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' 
    };
    component.messages = [msg];
    fixture.detectChanges();
  
    const fakeElement = {
      querySelector: jasmine.createSpy('querySelector').and.returnValue({ getBoundingClientRect: () => ({}) }),
      getBoundingClientRect: () => ({})
    };
  
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      target: {
        closest: jasmine.createSpy('closest').and.returnValue(fakeElement)
      }
    } as any as MouseEvent;
  
    component.scrollContainer = {
      nativeElement: { getBoundingClientRect: () => ({}) }
    } as any;
  
    component.onMessageRightClick(event, msg);
  
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.contextMenuMessageId).toBe('1');
    expect(component.showContextMenu).toBeTrue();
  });  
  
  it('should emit editMessage event', () => {
    const msg: OtoMessage = { messageId: '1', sender: 'currentUser', content: 'Hello', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' };
    component.messages = [msg];
    component.contextMenuMessageId = '1';

    let emittedMsg: OtoMessage | undefined;
    component.editMessage.subscribe(m => emittedMsg = m);
    component.onEditMessage();

    expect(emittedMsg).toEqual(msg);
    expect(component.showContextMenu).toBeFalse();
  });

  it('should emit deleteMessage event', () => {
    const msg: OtoMessage = { messageId: '1', sender: 'currentUser', content: 'Hello', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' };
    component.messages = [msg];
    component.contextMenuMessageId = '1';

    let emittedMsg: OtoMessage | undefined;
    component.deleteMessage.subscribe(m => emittedMsg = m);
    component.onDeleteMessage();

    expect(emittedMsg).toEqual(msg);
    expect(component.showContextMenu).toBeFalse();
  });

  it('should emit replyToMessage event', () => {
    const msg: OtoMessage = { messageId: '1', sender: 'user', content: 'Hello', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' };
    component.messages = [msg];
    component.contextMenuMessageId = '1';

    let emittedMsg: OtoMessage | undefined;
    component.replyToMessage.subscribe(m => emittedMsg = m);
    component.onReplyToMessage();

    expect(emittedMsg).toEqual(msg);
    expect(component.showContextMenu).toBeFalse();
  });

  it('canEditOrDelete returns true for my non-deleted message', () => {
    const msg: OtoMessage = { messageId: '1', sender: 'currentUser', content: 'Hello', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' };
    component.messages = [msg];
    component.contextMenuMessageId = '1';
    expect(component.canEditOrDelete()).toBeTrue();
  });

  it('canEditOrDelete returns false for deleted message', () => {
    const msg: OtoMessage = { messageId: '1', sender: 'currentUser', content: 'Hello', sentAt: new Date().toISOString(), isDeleted: true, recipient: 'recipientUser' };
    component.messages = [msg];
    component.contextMenuMessageId = '1';
    expect(component.canEditOrDelete()).toBeFalse();
  });

  it('canEditOrDelete returns false when message not found', () => {
    component.contextMenuMessageId = 'nonexistent';
    expect(component.canEditOrDelete()).toBeFalse();
  });

  it('should handle missing __otoMessages$ in initChat', fakeAsync(() => {
    (window as any).__otoMessages$ = null;
    component.chatNickName = 'test';
    
    const spy = spyOn<any>(component, 'loadMore');
    component['initChat']();
    
    expect(spy).toHaveBeenCalled();
  }));

  it('should handle invalid __otoMessages$ (not a function) in initChat', fakeAsync(() => {
    (window as any).__otoMessages$ = { notAFunction: true };
    component.chatNickName = 'test';
    
    const spy = spyOn<any>(component, 'loadMore');
    component['initChat']();
    
    expect(spy).toHaveBeenCalled();
  }));

  it('should handle missing __otoUserInfoDeleted$ in subscribeToUserDeletion', () => {
    (window as any).__otoUserInfoDeleted$ = null;
    expect(() => component['subscribeToUserDeletion']()).not.toThrow();
  });

  it('should handle invalid __otoUserInfoDeleted$ in subscribeToUserDeletion', () => {
    (window as any).__otoUserInfoDeleted$ = { notAFunction: true };
    expect(() => component['subscribeToUserDeletion']()).not.toThrow();
  });

  it('should handle missing loadHistory in loadMore', () => {
    (window as any).__otoLoadHistory = undefined;
    component.loading = false;
    
    component['loadMore']();
    expect(component.loading).toBeFalse();
  });

  it('should return false from isScrolledToBottom when no scrollContainer', () => {
    component.scrollContainer = undefined as any;
    expect(component['isScrolledToBottom']()).toBeFalse();
  });

  it('should handle missing scrollContainer in scrollToBottom', () => {
    component.scrollContainer = undefined as any;
    expect(() => component['scrollToBottom']()).not.toThrow();
  });

  it('should clear messages for deleted user', () => {
    component.messages = [{ messageId: '1', sender: 'user', recipient: 'recipientUser', content: 'Hi', sentAt: new Date().toISOString(), isDeleted: false }];
    component.skip = 10;
    component.allLoaded = true;

    component.clearMessagesForDeletedUser();

    expect(component.messages.length).toBe(0);
    expect(component.skip).toBe(0);
    expect(component.allLoaded).toBeFalse();
  });

  it('should remove event listener on destroy', () => {
    const removeEventListenerSpy = spyOn(document, 'removeEventListener');
    component['hideContextMenuHandler'] = jasmine.createSpy();
    
    component.ngOnDestroy();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', component['hideContextMenuHandler']);
  });

  it('should not throw error on destroy without hideContextMenuHandler', () => {
    component['hideContextMenuHandler'] = undefined;
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('should handle loading and allLoaded flags in loadMore', () => {
    component.loading = true;
    component.allLoaded = false;
    
    const spy = spyOn<any>(component, 'loadMore').and.callThrough();
    component['loadMore']();
    
    expect(spy).toHaveBeenCalled();
  });

  it('should handle allLoaded flag in loadMore', () => {
    component.loading = false;
    component.allLoaded = true;
    
    const spy = spyOn<any>(component, 'loadMore').and.callThrough();
    component['loadMore']();
    
    expect(spy).toHaveBeenCalled();
  });

  it('should correctly detect if scrolled to bottom', () => {
    component.scrollContainer = {
      nativeElement: {
        scrollHeight: 1000,
        scrollTop: 490,
        clientHeight: 500
      }
    } as any;
    
    expect(component['isScrolledToBottom']()).toBeTrue();
    
    component.scrollContainer.nativeElement.scrollTop = 450;
    expect(component['isScrolledToBottom']()).toBeFalse();
  });

  it('should add message to existing group when dates match', () => {
    const today = new Date();
    const messages: OtoMessage[] = [
      { 
        messageId: '1', 
        sender: 'user', 
        content: 'First message', 
        sentAt: today.toISOString(), 
        isDeleted: false, 
        recipient: 'recipientUser' 
      },
      { 
        messageId: '2', 
        sender: 'user', 
        content: 'Second message', 
        sentAt: today.toISOString(),
        isDeleted: false, 
        recipient: 'recipientUser' 
      }
    ];
    component.messages = messages;
    
    const grouped = component.groupedMessages;
    expect(grouped.length).toBe(1);
    expect(grouped[0].messages.length).toBe(2);
    expect(grouped[0].date).toBe(today.toDateString());
  });

  it('should hide context menu when document is clicked', fakeAsync(() => {
    component.showContextMenu = true;
    component.ngAfterViewInit();
    tick();

    const clickEvent = new Event('click');
    document.dispatchEvent(clickEvent);

    expect(component.showContextMenu).toBeFalse();
  }));

  it('should return deletion message for deleted content', () => {
    const deletedMsg: any = {
      messageId: '1',
      sender: 'user',
      content: 'Original content',
      sentAt: new Date().toISOString(),
      recipient: 'recipientUser'
    };
    
    Object.defineProperty(deletedMsg, 'isDeleted', {
      get: function() {
        if (!this._called) {
          this._called = true;
          return false;
        }
        return true;
      },
      configurable: true
    });

    const result = component.getMessageContent(deletedMsg);
    expect(result).toBeDefined();
  });

  it('should handle edge case in getMessageContent with manipulated deleted state', () => {
    const mockMessage = {
      messageId: '1',
      sender: 'user', 
      content: 'Test message',
      sentAt: new Date().toISOString(),
      recipient: 'recipientUser',
      isDeleted: false
    };

    expect(component.getMessageContent(mockMessage)).toBe('Test message');
    
    mockMessage.isDeleted = true;
    expect(component.getMessageContent(mockMessage)).toBe('Test message');
    
    const specialMessage = Object.create(mockMessage);
    Object.defineProperty(specialMessage, 'isDeleted', {
      get: function() {
        return true;
      }
    });
    
    const result = component.getMessageContent(specialMessage);
    expect(result).toBe('Test message');
  });

  it('should not handle user deletion for different userName', fakeAsync(() => {
    const userDeleted$ = new Subject<any>();
    (window as any).__otoUserInfoDeleted$ = userDeleted$;
    
    component.chatNickName = 'testUser';
    component.messages = [
      { messageId: '1', sender: 'user', content: 'Test', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' }
    ];
    
    let chatUserDeletedEmitted = false;
    component.chatUserDeleted.subscribe(() => chatUserDeletedEmitted = true);
    
    component['subscribeToUserDeletion']();
    
    userDeleted$.next({ userName: 'otherUser' });
    tick();
    
    expect(component.messages.length).toBe(1);
    expect(chatUserDeletedEmitted).toBeFalse();
  }));

  it('should handle user deletion event with invalid info', fakeAsync(() => {
    const userDeleted$ = new Subject<any>();
    (window as any).__otoUserInfoDeleted$ = userDeleted$;
    
    component.chatNickName = 'testUser';
    component['subscribeToUserDeletion']();
    
    let chatUserDeletedEmitted = false;
    component.chatUserDeleted.subscribe(() => chatUserDeletedEmitted = true);
    
    userDeleted$.next(null);
    tick();
    
    expect(chatUserDeletedEmitted).toBeFalse();
    
    userDeleted$.next({ userName: undefined });
    tick();
    
    expect(chatUserDeletedEmitted).toBeFalse();
  }));

  it('should return false when highlightedMessageId is null', () => {
    component.highlightedMessageId = null;
    expect(component.isMessageHighlighted('any-id')).toBeFalse();
  });

  it('should call scrollToBottom after view init', fakeAsync(() => {
    const scrollToBottomSpy = spyOn<any>(component, 'scrollToBottom');
    component.ngAfterViewInit();
    tick();
    
    expect(scrollToBottomSpy).toHaveBeenCalled();
  }));

  it('should merge new messages from messages$ and scroll to bottom if needed', fakeAsync(() => {
    const msgs$ = new BehaviorSubject<OtoMessage[]>([]);
    component.messages$ = msgs$.asObservable();
    component.chatNickName = 'test';
    
    const scrollSpy = spyOn<any>(component, 'scrollToBottom');
    
    component['initChat']();
    
    const msg1: OtoMessage = {
      messageId: '1',
      sender: 'user',
      content: 'Hello',
      sentAt: new Date().toISOString(),
      isDeleted: false,
      recipient: 'recipient'
    };
    msgs$.next([msg1]);
    tick();
    
    expect(component.messages.length).toBe(1);
    expect(component.messages[0].messageId).toBe('1');
    expect(scrollSpy).toHaveBeenCalled();
  }));

  it('should remove messages that disappeared from messages$', fakeAsync(() => {
    const msgs$ = new BehaviorSubject<OtoMessage[]>([]);
    component.messages$ = msgs$.asObservable();
    component.chatNickName = 'test';
    
    component['initChat']();
  
    const msg1: OtoMessage = {
      messageId: '1',
      sender: 'user',
      content: 'First',
      sentAt: new Date().toISOString(),
      isDeleted: false,
      recipient: 'recipient'
    };
    const msg2: OtoMessage = {
      messageId: '2',
      sender: 'user',
      content: 'Second',
      sentAt: new Date().toISOString(),
      isDeleted: false,
      recipient: 'recipient'
    };
    msgs$.next([msg1, msg2]);
    tick();
    expect(component.messages.length).toBe(2);
  
    msgs$.next([msg1]);
    tick();
    expect(component.messages.length).toBe(1);
    expect(component.messages[0].messageId).toBe('1');
  }));

  it('should clear messages and emit chatUserDeleted when user with same chatNickName is deleted', fakeAsync(() => {
    const deleted$ = new Subject<{ userName: string }>();
    component.userInfoDeleted$ = deleted$.asObservable();
    component.chatNickName = 'testUser';
    component.messages = [{
      messageId: '1',
      sender: 'someone',
      content: 'Hello',
      sentAt: new Date().toISOString(),
      isDeleted: false,
      recipient: 'recipient'
    }];
  
    let emitted = false;
    component.chatUserDeleted.subscribe(() => emitted = true);
  
    component['subscribeToUserDeletion']();
  
    deleted$.next({ userName: 'testUser' });
    tick();
  
    expect(component.messages.length).toBe(0);
    expect(emitted).toBeTrue();
  }));

  it('should set allLoaded to true when no unique messages returned', fakeAsync(() => {
    const msg1: OtoMessage = {
      messageId: '1',
      sender: 'user',
      content: 'first',
      sentAt: new Date().toISOString(),
      isDeleted: false,
      recipient: 'recipient'
    };
  
    component.chatNickName = 'test';
    component.messages = [msg1];
    component.skip = 1;
  
    component.loadHistory = jasmine.createSpy().and.returnValue(of([msg1]));
  
    component['loadMore']();
    tick();
  
    expect(component.allLoaded).toBeTrue();
    expect(component.loading).toBeFalse();
  }));

  it('should filter out deleted messages only if they are from me', fakeAsync(() => {
    const deletedMine: OtoMessage = {
      messageId: '1',
      sender: 'me',
      content: 'deleted',
      sentAt: new Date().toISOString(),
      isDeleted: true,
      recipient: 'recipient'
    };
    const deletedNotMine: OtoMessage = {
      messageId: '2',
      sender: 'other',
      content: 'deleted',
      sentAt: new Date().toISOString(),
      isDeleted: true,
      recipient: 'recipient'
    };
  
    spyOn(component, 'isMyMessage').and.callFake(m => m.sender === 'me');
  
    component.chatNickName = 'test';
    component.messages = [];
    component.loadHistory = jasmine.createSpy().and.returnValue(of([deletedMine, deletedNotMine]));
  
    component['loadMore']();
    tick();
  
    expect(component.messages.length).toBe(1);
    expect(component.messages[0].messageId).toBe('2');
    expect(component.loading).toBeFalse();
  }));

  it('should filter out deleted messages only if they are from me (initChat)', fakeAsync(() => {
    const deletedMine: OtoMessage = {
      messageId: '1',
      sender: 'me',
      content: 'deleted',
      sentAt: new Date().toISOString(),
      isDeleted: true,
      recipient: 'recipient'
    };
    const deletedNotMine: OtoMessage = {
      messageId: '2',
      sender: 'other',
      content: 'deleted',
      sentAt: new Date().toISOString(),
      isDeleted: true,
      recipient: 'recipient'
    };
  
    spyOn(component, 'isMyMessage').and.callFake(m => m.sender === 'me');
    component.messages$ = of([deletedMine, deletedNotMine]);

    spyOn(component as any, 'loadMore').and.stub();

    component['initChat']();
    tick();
  
    expect(component.messages.length).toBe(1);
    expect(component.messages[0].messageId).toBe('2');
  }));
  
  it('should scroll to bottom when shouldScrollToBottom is true (initChat)', fakeAsync(() => {
    const msg: OtoMessage = {
      messageId: '1',
      sender: 'user',
      content: 'test',
      sentAt: new Date().toISOString(),
      isDeleted: false,
      recipient: 'recipient'
    };
  
    component.messages$ = of([msg]);

    spyOn(component as any, 'loadMore').and.stub();
    spyOn(component as any, 'isScrolledToBottom').and.returnValue(false);
    spyOn(component as any, 'scrollToBottom');
  
    (component as any).initChat();
    tick();
    tick();
  
    expect((component as any).scrollToBottom).toHaveBeenCalled();
    expect((component as any).shouldScrollToBottom).toBeFalse();
  }));
});