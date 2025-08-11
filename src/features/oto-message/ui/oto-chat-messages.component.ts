import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { OtoMessage } from '../../../entities/oto-message';

@Component({
  selector: 'app-oto-chat-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oto-chat-messages.component.html',
})
export class OtoChatMessagesComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() chatNickName!: string;
  @Input() currentUserNickName!: string;

  @Output() editMessage = new EventEmitter<OtoMessage>();
  @Output() deleteMessage = new EventEmitter<OtoMessage>();
  @Output() replyToMessage = new EventEmitter<OtoMessage>();
  @Output() chatUserDeleted = new EventEmitter<void>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  messages: OtoMessage[] = [];
  take = 20;
  skip = 0;
  allLoaded = false;
  loading = false;
  private prevScrollHeight = 0;
  contextMenuMessageId: string | null = null;
  contextMenuPosition = { x: 0, y: 0 };
  showContextMenu = false;
  highlightedMessageId: string | null = null;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  constructor() {}

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 0);
    
    const hideContextMenu = () => {
      this.showContextMenu = false;
    };
    
    document.addEventListener('click', hideContextMenu);
    
    this.hideContextMenuHandler = hideContextMenu;

    this.subscribeToUserDeletion();
  }

  private hideContextMenuHandler?: () => void;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['chatNickName'] && this.chatNickName) {
      this.initChat();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.hideContextMenuHandler) {
      document.removeEventListener('click', this.hideContextMenuHandler);
    }
  }

  private subscribeToUserDeletion() {
    const global$ = (window as any).__otoUserInfoDeleted$ as any;
    if (global$ && typeof global$.pipe === 'function') {
      global$
        .pipe(
          takeUntil(this.destroy$),
          filter((deletedUserInfo: any) => deletedUserInfo?.userName === this.chatNickName)
        )
        .subscribe(() => this.handleChatUserDeleted());
    }
  }

  private handleChatUserDeleted() {
    this.messages = [];
    this.chatUserDeleted.emit();
  }

  private initChat() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.shouldScrollToBottom = true;
    this.loadMore();
  
    const messages$ = (window as any).__otoMessages$ as any;
    if (!messages$ || typeof messages$.pipe !== 'function') {
      return;
    }

    messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((newMsgs: OtoMessage[]) => {
        const filteredNewMsgs = newMsgs.filter(msg => {
          if (msg.isDeleted) {
            return !this.isMyMessage(msg);
          }
          return true;
        });

        const newMap = new Map(filteredNewMsgs.map(msg => [msg.messageId, msg]));
        const oldMap = new Map(this.messages.map(msg => [msg.messageId, msg]));
      
        for (const msg of filteredNewMsgs) {
          oldMap.set(msg.messageId, msg);
        }
      
        for (const oldMsgId of oldMap.keys()) {
          if (!newMap.has(oldMsgId)) {
            oldMap.delete(oldMsgId);
          }
        }
      
        this.messages = Array.from(oldMap.values()).sort((a, b) =>
          new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
        this.skip = this.messages.length;
      
        if (this.isScrolledToBottom() || this.shouldScrollToBottom) {
          setTimeout(() => this.scrollToBottom(), 0);
          this.shouldScrollToBottom = false;
        }
      });
  }

  onScroll() {
    if (this.showContextMenu) {
      this.showContextMenu = false;
    }
  
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    
    if (el.scrollTop < 300 && !this.loading && !this.allLoaded) {
      this.prevScrollHeight = el.scrollHeight;
      this.loadMore();
    }
  }

  private isScrolledToBottom(): boolean {
    if (!this.scrollContainer) return false;
    const el = this.scrollContainer.nativeElement;
    return el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
  }

  private scrollToBottom() {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  private loadMore() {
    if (this.loading || this.allLoaded) return;
    this.loading = true;

    const loadHistory = (window as any).__otoLoadHistory as ((nick: string, take: number, skip: number) => any) | undefined;
    if (!loadHistory) {
      this.loading = false;
      return;
    }
    loadHistory(this.chatNickName, this.take, this.skip)
      .pipe(takeUntil(this.destroy$))
      .subscribe((newMsgs: OtoMessage[]) => {
        const filteredNewMsgs = newMsgs.filter((msg: OtoMessage) => {
          if (msg.isDeleted) {
            return !this.isMyMessage(msg);
          }
          return true;
        });

        const existingIds = new Set(this.messages.map((m: OtoMessage) => m.messageId));
        const uniqueNewMsgs = filteredNewMsgs.filter((m: OtoMessage) => !existingIds.has(m.messageId));

        if (uniqueNewMsgs.length === 0) {
          this.allLoaded = true;
        } else {
          this.messages = [...uniqueNewMsgs, ...this.messages];
          this.skip = this.messages.length;

          setTimeout(() => {
            if (this.scrollContainer) {
              const el = this.scrollContainer.nativeElement;
              el.scrollTop = el.scrollHeight - this.prevScrollHeight;
            }
          }, 0);
        }
        
        this.loading = false;
      });
  }

public scrollToMessage(messageId: string): void {
  
  if (!this.scrollContainer) {
    return;
  }
  
  const messageElement = this.scrollContainer.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
  
  if (!messageElement) {
    
    setTimeout(() => {
      const retryElement = this.scrollContainer!.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
      if (retryElement) {
        retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.highlightMessage(messageId);
      }
    }, 1000);
    
    return;
  }

  messageElement.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center' 
  });
  
  setTimeout(() => {
    this.highlightMessage(messageId);
  }, 300);
}

  getRepliedMessage(messageId: string): OtoMessage | null {
    return this.messages.find(msg => msg.messageId === messageId) || null;
  }

  highlightMessage(messageId: string) {
    this.highlightedMessageId = null;
    
    this.highlightedMessageId = messageId;
    
    setTimeout(() => {
      if (this.highlightedMessageId === messageId) {
        this.highlightedMessageId = null;
      }
    }, 1500);
  }

  onScrollToReplyMessage(messageId: string) {
    this.scrollToMessage(messageId);
  }

  isMessageHighlighted(messageId: string): boolean {
    return this.highlightedMessageId === messageId;
  }

  get groupedMessages() {
    const groups: { date: string; messages: OtoMessage[] }[] = [];
    let lastDate = '';
    
    const filteredMessages = this.messages.filter(msg => {
      if (msg.isDeleted) {
        if (this.isMyMessage(msg)) {
          return false;
        }
        return true;
      }
      return true;
    });

    const sorted = [...filteredMessages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

    for (const msg of sorted) {
      const msgDate = new Date(msg.sentAt).toDateString();
      if (msgDate !== lastDate) {
        groups.push({ date: msgDate, messages: [msg] });
        lastDate = msgDate;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  }

  isMyMessage(msg: OtoMessage): boolean {
    const result = msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
    return result;
  }

  isToday(date: string | Date): boolean {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }

  isMessageDeleted(msg: OtoMessage): boolean {
    return msg.isDeleted === true;
  }

  getMessageContent(msg: OtoMessage): string {
    if (msg.isDeleted) {
      return msg.content;
    }
    if (msg.isDeleted) {
      return 'This message was deleted';
    }
    return msg.content;
  }

  truncateText(text: string, maxLength: number = 50): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  onMessageRightClick(event: MouseEvent, msg: OtoMessage) {
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.target as HTMLElement;
    const messageContainer = target.closest('.message-container') as HTMLElement;
    
    if (messageContainer) {
      const messageBlock = messageContainer.querySelector('[class*="px-3 py-2 rounded-2xl"]') as HTMLElement;
      
      if (messageBlock) {
        const blockRect = messageBlock.getBoundingClientRect();
        const scrollContainer = this.scrollContainer.nativeElement;
        const containerRect = scrollContainer.getBoundingClientRect();
        
        const isMyMsg = this.isMyMessage(msg);
        const menuWidth = 150;
        const menuHeight = 120;
        
        let x: number;
        let y: number;
        
        if (isMyMsg) {
          x = blockRect.left - menuWidth - 8;
          if (x < containerRect.left + 8) {
            x = blockRect.right + 8;
          }
        } else {
          x = blockRect.right + 8;
          
          if (x + menuWidth > containerRect.right - 8) {
            x = blockRect.left - menuWidth - 8;
          }
        }
        
        y = blockRect.top + (blockRect.height / 2) - (menuHeight / 2);
        
        const minY = 10;
        const maxY = window.innerHeight - menuHeight - 10;
        y = Math.max(minY, Math.min(y, maxY));
        
        this.contextMenuMessageId = msg.messageId;
        this.contextMenuPosition = { x, y };
        this.showContextMenu = true;
      }
    }
  }

  onEditMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) {
      this.editMessage.emit(msg);
    }
    this.showContextMenu = false;
  }

  onDeleteMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) {
      this.deleteMessage.emit(msg);
    }
    this.showContextMenu = false;
  }

  onReplyToMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) {
      this.replyToMessage.emit(msg);
    }
    this.showContextMenu = false;
  }

  canEditOrDelete(): boolean {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (!msg) return false;
    
    if (this.isMessageDeleted(msg)) return false;
    
    return this.isMyMessage(msg);
  }

  clearMessagesForDeletedUser() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
  }
}