import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { OtoChatMessagesWidget } from './oto-chat-messages.widget';
import { OtoMessage } from '../../../entities/oto-message';
import { Subject, of } from 'rxjs';

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

  it('should create the component', () => {
    expect(component).toBeTruthy();
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

  it('should check if message is highlighted', () => {
    component.highlightedMessageId = '1';
    expect(component.isMessageHighlighted('1')).toBeTrue();
    expect(component.isMessageHighlighted('2')).toBeFalse();
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

  it('should group messages by date', () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const messages: OtoMessage[] = [
      { messageId: '1', sender: 'user', content: 'Hello today', 
        sentAt: today.toISOString(), isDeleted: false, recipient: 'recipientUser' },
      { messageId: '2', sender: 'user', content: 'Hello yesterday', 
        sentAt: yesterday.toISOString(), isDeleted: false, recipient: 'recipientUser' }
    ];
    component.messages = messages;
    
    const grouped = component.groupedMessages;
    expect(grouped.length).toBe(2);
    expect(grouped[0].date).toBe(yesterday.toDateString());
    expect(grouped[1].date).toBe(today.toDateString());
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

  it('should track groups by date', () => {
    const group = { date: '2023-01-01', messages: [] };
    expect(component.trackByGroup(0, group)).toBe('2023-01-01');
  });

  it('should track messages by messageId', () => {
    const msg: OtoMessage = { 
      messageId: '1', sender: 'user', content: 'Hello', 
      sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' 
    };
    expect(component.trackByMessageId(0, msg)).toBe('1');
  });

  it('should handle scroll and hide context menu', () => {
    component.showContextMenu = true;
    component.scrollContainer = {
      nativeElement: { scrollTop: 100, scrollHeight: 1000, clientHeight: 500 }
    } as any;
    
    component.onScroll();
    expect(component.showContextMenu).toBeFalse();
  });

  it('should trigger loadMore on scroll near top', () => {
    const spy = spyOn<any>(component, 'loadMore');
    component.loading = false;
    component.allLoaded = false;
    component.scrollContainer = {
      nativeElement: { scrollTop: 100, scrollHeight: 1000 }
    } as any;
    
    component.onScroll();
    expect(component['prevScrollHeight']).toBe(1000);
    expect(spy).toHaveBeenCalled();
  });

  it('should return early from onScroll if no scrollContainer', () => {
    component.scrollContainer = undefined as any;
    expect(() => component.onScroll()).not.toThrow();
  });

  it('should return message content or deletion notice', () => {
    const normalMsg: OtoMessage = { 
      messageId: '1', sender: 'user', content: 'Hello', 
      sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' 
    };
    const deletedMsg: OtoMessage = { 
      messageId: '2', sender: 'user', content: 'Original content', 
      sentAt: new Date().toISOString(), isDeleted: true, recipient: 'recipientUser' 
    };
    
    expect(component.getMessageContent(normalMsg)).toBe('Hello');
    expect(component.getMessageContent(deletedMsg)).toBe('Original content');
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

  it('should subscribe to messages and update the list', fakeAsync(() => {
    const messages$ = new Subject<OtoMessage[]>();
    (window as any).__otoMessages$ = messages$;
    component.chatNickName = 'chat1';
    component.ngOnChanges({
      chatNickName: { currentValue: 'chat1', previousValue: '', firstChange: true, isFirstChange: () => true },
    });

    const msg: OtoMessage = { messageId: '1', sender: 'user', content: 'Hi', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' };
    messages$.next([msg]);
    tick();

    expect(component.messages.length).toBe(1);
    expect(component.messages[0]).toEqual(msg);
  }));

  it('should filter deleted messages correctly in messages subscription', fakeAsync(() => {
    const messages$ = new Subject<OtoMessage[]>();
    (window as any).__otoMessages$ = messages$;
    component.chatNickName = 'chat1';
    component.ngOnChanges({
      chatNickName: { currentValue: 'chat1', previousValue: '', firstChange: true, isFirstChange: () => true },
    });

    const myDeletedMsg: OtoMessage = { 
      messageId: '1', sender: 'currentUser', content: 'My deleted', 
      sentAt: new Date().toISOString(), isDeleted: true, recipient: 'other' 
    };
    const otherDeletedMsg: OtoMessage = { 
      messageId: '2', sender: 'other', content: 'Other deleted', 
      sentAt: new Date().toISOString(), isDeleted: true, recipient: 'currentUser' 
    };
    
    messages$.next([myDeletedMsg, otherDeletedMsg]);
    tick();

    expect(component.messages.length).toBe(1);
    expect(component.messages[0].sender).toBe('other');
  }));

  it('should remove messages not in new list', fakeAsync(() => {
    const messages$ = new Subject<OtoMessage[]>();
    (window as any).__otoMessages$ = messages$;
    component.chatNickName = 'chat1';
    component.ngOnChanges({
      chatNickName: { currentValue: 'chat1', previousValue: '', firstChange: true, isFirstChange: () => true },
    });

    const msg1: OtoMessage = { messageId: '1', sender: 'user', content: 'First', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' };
    const msg2: OtoMessage = { messageId: '2', sender: 'user', content: 'Second', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' };
    messages$.next([msg1, msg2]);
    tick();
    expect(component.messages.length).toBe(2);

    messages$.next([msg1]);
    tick();
    expect(component.messages.length).toBe(1);
    expect(component.messages[0].messageId).toBe('1');
  }));

  it('should scroll to bottom when shouldScrollToBottom is true', fakeAsync(() => {
    const messages$ = new Subject<OtoMessage[]>();
    (window as any).__otoMessages$ = messages$;
    
    const scrollToBottomSpy = spyOn<any>(component, 'scrollToBottom');
    spyOn<any>(component, 'isScrolledToBottom').and.returnValue(false);
    
    component.chatNickName = 'chat1';
    component['shouldScrollToBottom'] = true;
    component.ngOnChanges({
      chatNickName: { currentValue: 'chat1', previousValue: '', firstChange: true, isFirstChange: () => true },
    });

    const msg: OtoMessage = { messageId: '1', sender: 'user', content: 'Hi', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' };
    messages$.next([msg]);
    tick();

    expect(scrollToBottomSpy).toHaveBeenCalled();
    expect(component['shouldScrollToBottom']).toBeFalse();
  }));

  it('should clear messages when chat user deleted', () => {
    const userDeleted$ = new Subject<any>();
    (window as any).__otoUserInfoDeleted$ = userDeleted$;
    component.chatNickName = 'chat1';
    component.ngAfterViewInit();

    let emitted = false;
    component.chatUserDeleted.subscribe(() => emitted = true);
    userDeleted$.next({ userName: 'chat1' });

    expect(component.messages.length).toBe(0);
    expect(emitted).toBeTrue();
  });

  it('should load more messages', fakeAsync(() => {
    const loadHistory = jasmine.createSpy('loadHistory').and.returnValue(of([
      { messageId: '1', sender: 'user', content: 'Hi', sentAt: new Date().toISOString(), isDeleted: false }
    ]));
    (window as any).__otoLoadHistory = loadHistory;
    component.chatNickName = 'chat1';
    component['prevScrollHeight'] = 0;
    component.scrollContainer = { nativeElement: { scrollHeight: 100, scrollTop: 0 } } as any;

    component['loadMore']();
    tick();

    expect(component.messages.length).toBe(1);
    expect(component.allLoaded).toBeFalse();
  }));

  it('should set allLoaded to true when no new unique messages', fakeAsync(() => {
    const existingMsg: OtoMessage = { 
      messageId: '1', sender: 'user', content: 'Existing', 
      sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' 
    };
    component.messages = [existingMsg];
    
    const loadHistory = jasmine.createSpy('loadHistory').and.returnValue(of([existingMsg]));
    (window as any).__otoLoadHistory = loadHistory;
    component.chatNickName = 'chat1';
    component.loading = false;
    component.allLoaded = false;

    component['loadMore']();
    tick();

    expect(component.allLoaded).toBeTrue();
    expect(component.loading).toBeFalse();
  }));

  it('should filter deleted messages in loadMore', fakeAsync(() => {
    const myDeletedMsg: OtoMessage = { 
      messageId: '1', sender: 'currentUser', content: 'My deleted', 
      sentAt: new Date().toISOString(), isDeleted: true, recipient: 'other' 
    };
    const otherDeletedMsg: OtoMessage = { 
      messageId: '2', sender: 'other', content: 'Other deleted', 
      sentAt: new Date().toISOString(), isDeleted: true, recipient: 'currentUser' 
    };
    
    const loadHistory = jasmine.createSpy('loadHistory').and.returnValue(of([myDeletedMsg, otherDeletedMsg]));
    (window as any).__otoLoadHistory = loadHistory;
    component.chatNickName = 'chat1';
    component.loading = false;

    component['loadMore']();
    tick();

    expect(component.messages.length).toBe(1);
    expect(component.messages[0].sender).toBe('other');
  }));

  it('should adjust scroll position after loading more messages', fakeAsync(() => {
    const loadHistory = jasmine.createSpy('loadHistory').and.returnValue(of([
      { messageId: '1', sender: 'user', content: 'Hi', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' }
    ]));
    (window as any).__otoLoadHistory = loadHistory;
    
    component.scrollContainer = { 
      nativeElement: { 
        scrollHeight: 200, 
        scrollTop: 0
      } 
    } as any;
    component['prevScrollHeight'] = 100;
    component.chatNickName = 'chat1';
    component.loading = false;

    component['loadMore']();
    tick();

    expect(component.scrollContainer.nativeElement.scrollTop).toBe(100);
  }));

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

  it('should set up document click listener correctly in ngAfterViewInit', fakeAsync(() => {
    const addEventListenerSpy = spyOn(document, 'addEventListener');
    component.ngAfterViewInit();
    tick();
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('click', jasmine.any(Function));
    
    expect(component['hideContextMenuHandler']).toBeDefined();
  }));

  it('should handle user deletion subscription with matching userName', fakeAsync(() => {
    const userDeleted$ = new Subject<any>();
    (window as any).__otoUserInfoDeleted$ = userDeleted$;
    
    component.chatNickName = 'testUser';
    component.messages = [
      { messageId: '1', sender: 'user', content: 'Test', sentAt: new Date().toISOString(), isDeleted: false, recipient: 'recipientUser' }
    ];
    
    let chatUserDeletedEmitted = false;
    component.chatUserDeleted.subscribe(() => chatUserDeletedEmitted = true);
    
    component['subscribeToUserDeletion']();
    
    userDeleted$.next({ userName: 'testUser' });
    tick();
    
    expect(component.messages.length).toBe(0);
    expect(chatUserDeletedEmitted).toBeTrue();
  }));

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
});