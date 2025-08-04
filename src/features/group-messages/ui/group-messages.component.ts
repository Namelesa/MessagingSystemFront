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
import { GroupMessagesApiService } from '../api/group-messages.api';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GroupMessage } from '../model/group-message.model';
import { AuthService } from '../../../entities/user/api/auht.service';

@Component({
  selector: 'app-group-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-messages.component.html',
})
export class GroupMessagesComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() groupId!: string;
  @Input() members: { nickName: string; image: string }[] = [];

  @Output() editMessage = new EventEmitter<GroupMessage>();
  @Output() deleteMessage = new EventEmitter<GroupMessage>();
  @Output() replyToMessage = new EventEmitter<GroupMessage>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  messages: GroupMessage[] = [];
  take = 20;
  skip = 0;
  allLoaded = false;
  loading = false;
  private prevScrollHeight = 0;
  contextMenuMessageId: string | null = null;
  contextMenuPosition = { x: 0, y: 0 };
  showContextMenu = false;
  highlightedMessageId: string | null = null;
  currentUserNickName: string;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  constructor(private api: GroupMessagesApiService, private authService: AuthService) {
    this.currentUserNickName = this.authService.getNickName() || '';
  }

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 0);
    
    const hideContextMenu = () => {
      this.showContextMenu = false;
    };
    
    document.addEventListener('click', hideContextMenu);
    
    this.hideContextMenuHandler = hideContextMenu;
  }

  private hideContextMenuHandler?: () => void;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['groupId'] && this.groupId) {
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

  private initChat() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.shouldScrollToBottom = true;
    this.loadMore();
  
    this.api.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(newMsgs => {
        const filteredNewMsgs = newMsgs.filter(msg => {
          if (msg.isDeleted) {
            return !this.isMyMessage(msg);
          }
          return true;
        });

        const newMap = new Map(filteredNewMsgs.map(msg => [msg.id, msg]));
        const oldMap = new Map(this.messages.map(msg => [msg.id, msg]));
      
        for (const msg of filteredNewMsgs) {
          oldMap.set(msg.id, msg);
        }
      
        for (const oldMsgId of oldMap.keys()) {
          if (!newMap.has(oldMsgId)) {
            oldMap.delete(oldMsgId);
          }
        }
      
        this.messages = Array.from(oldMap.values()).sort((a, b) =>
          new Date(a.sendTime).getTime() - new Date(b.sendTime).getTime()
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

    this.api.loadChatHistory(this.groupId, this.take, this.skip)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newMsgs) => {
        const filteredNewMsgs = newMsgs.filter(msg => {
          if (msg.isDeleted) {
            return !this.isMyMessage(msg);
          }
          return true;
        });

        const existingIds = new Set(this.messages.map(m => m.id));
        const uniqueNewMsgs = filteredNewMsgs.filter(m => !existingIds.has(m.id));

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
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.loading = false;
      }
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

  getRepliedMessage(messageId: string): GroupMessage | null {
    return this.messages.find(msg => msg.id === messageId) || null;
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
    const groups: { date: string; messages: GroupMessage[] }[] = [];
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

    const sorted = [...filteredMessages].sort((a, b) => new Date(a.sendTime).getTime() - new Date(b.sendTime).getTime());

    for (const msg of sorted) {
      const msgDate = new Date(msg.sendTime).toDateString();
      if (msgDate !== lastDate) {
        groups.push({ date: msgDate, messages: [msg] });
        lastDate = msgDate;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  }

  isMyMessage(msg: GroupMessage): boolean {
    const result = msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
    return result;
  }

  isToday(date: string | Date): boolean {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }

  isMessageDeleted(msg: GroupMessage): boolean {
    return msg.isDeleted === true;
  }

  getMessageContent(msg: GroupMessage): string {
    return msg.isDeleted ? 'This message was deleted' : msg.content;
  }  

  truncateText(text: string, maxLength: number = 50): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  getMemberAvatar(nick: string): string | undefined {
    return this.members.find(m => m.nickName === nick)?.image;
  }

  shouldShowSenderName(messages: GroupMessage[], currentIndex: number): boolean {
    if (currentIndex === 0) return true;
    
    const currentMsg = messages[currentIndex];
    const previousMsg = messages[currentIndex - 1];
    return currentMsg.sender !== previousMsg.sender;
  }

  onMessageRightClick(event: MouseEvent, msg: GroupMessage) {
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
        
        this.contextMenuMessageId = msg.id;
        this.contextMenuPosition = { x, y };
        this.showContextMenu = true;
      }
    }
  }

  onEditMessage() {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (msg) {
      this.editMessage.emit(msg);
    }
    this.showContextMenu = false;
  }

  onDeleteMessage() {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (msg) {
      this.deleteMessage.emit(msg);
    }
    this.showContextMenu = false;
  }

  onReplyToMessage() {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (msg) {
      this.replyToMessage.emit(msg);
    }
    this.showContextMenu = false;
  }

  canEditOrDelete(): boolean {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (!msg) return false;
    
    if (this.isMessageDeleted(msg)) return false;
    
    return this.isMyMessage(msg);
  }
}