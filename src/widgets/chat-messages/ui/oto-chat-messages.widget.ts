import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { OtoMessage } from '../../../entities/oto-message';
import { isToday, truncateText, computeContextMenuPosition } from '../../../shared/realtime';

@Component({
  selector: 'widgets-oto-chat-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oto-chat-messages.widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtoChatMessagesWidget implements OnChanges, AfterViewInit, OnDestroy {
  @Input() chatNickName!: string;
  @Input() currentUserNickName!: string;
  @Input() loadHistory?: (nick: string, take: number, skip: number) => any;

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
  isMessageHighlighted(id: string): boolean {
    return this.highlightedMessageId === id;
  }

  private highlightMessage(messageId: string) {
    this.highlightedMessageId = null;
    this.highlightedMessageId = messageId;
    setTimeout(() => {
      if (this.highlightedMessageId === messageId) this.highlightedMessageId = null;
    }, 1500);
  }

  onScrollToReplyMessage(messageId: string) {
    this.scrollToMessage(messageId);
  }

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;
  private hideContextMenuHandler?: () => void;

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 0);
    const hideContextMenu = () => (this.showContextMenu = false);
    document.addEventListener('click', hideContextMenu);
    this.hideContextMenuHandler = hideContextMenu;
    this.subscribeToUserDeletion();
  }

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

  get groupedMessages() {
    const groups: { date: string; messages: OtoMessage[] }[] = [];
    let lastDate = '';
    const filtered = this.messages.filter(msg => !msg.isDeleted || !this.isMyMessage(msg));
    const sorted = [...filtered].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
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

  trackByGroup = (_: number, group: { date: string; messages: OtoMessage[] }) => group.date;
  trackByMessageId = (_: number, msg: OtoMessage) => msg.messageId;

  isToday = isToday;
  truncateText = truncateText;

  onScroll() {
    if (this.showContextMenu) this.showContextMenu = false;
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    if (el.scrollTop < 300 && !this.loading && !this.allLoaded) {
      this.prevScrollHeight = el.scrollHeight;
      this.loadMore();
    }
  }

  scrollToMessage(messageId: string): void {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
    if (!el) {
      setTimeout(() => {
        const retry = this.scrollContainer!.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
        if (retry) {
          retry.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.highlightMessage(messageId);
        }
      }, 1000);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => this.highlightMessage(messageId), 300);
  }

  getRepliedMessage(messageId: string): OtoMessage | null {
    return this.messages.find(m => m.messageId === messageId) || null;
  }

  onMessageRightClick(event: MouseEvent, msg: OtoMessage) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const messageContainer = target.closest('.message-container') as HTMLElement;
    if (!messageContainer) return;
    const messageBlock = messageContainer.querySelector('[class*="px-3 py-2 rounded-2xl"]') as HTMLElement;
    if (!messageBlock || !this.scrollContainer) return;
    const blockRect = messageBlock.getBoundingClientRect();
    const containerRect = this.scrollContainer.nativeElement.getBoundingClientRect();
    const pos = computeContextMenuPosition(blockRect, containerRect, this.isMyMessage(msg));
    this.contextMenuMessageId = msg.messageId;
    this.contextMenuPosition = pos;
    this.showContextMenu = true;
  }

  onEditMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) this.editMessage.emit(msg);
    this.showContextMenu = false;
  }

  onDeleteMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) this.deleteMessage.emit(msg);
    this.showContextMenu = false;
  }

  onReplyToMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) this.replyToMessage.emit(msg);
    this.showContextMenu = false;
  }

  canEditOrDelete(): boolean {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (!msg) return false;
    if (this.isMessageDeleted(msg)) return false;
    return this.isMyMessage(msg);
  }

  private initChat() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.shouldScrollToBottom = true;
    this.loadMore();

    // Use global messages$ or wait for it to be set
    const messages$ = (window as any).__otoMessages$ as any;
    if (!messages$ || typeof messages$.pipe !== 'function') return;
    messages$.pipe(takeUntil(this.destroy$)).subscribe((newMsgs: OtoMessage[]) => {
      const filtered = newMsgs.filter(msg => !msg.isDeleted || !this.isMyMessage(msg));
      const newMap = new Map(filtered.map(m => [m.messageId, m]));
      const oldMap = new Map(this.messages.map(m => [m.messageId, m]));
      for (const m of filtered) oldMap.set(m.messageId, m);
      for (const id of Array.from(oldMap.keys())) if (!newMap.has(id)) oldMap.delete(id);
      this.messages = Array.from(oldMap.values()).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      this.skip = this.messages.length;
      if (this.isScrolledToBottom() || this.shouldScrollToBottom) {
        setTimeout(() => this.scrollToBottom(), 0);
        this.shouldScrollToBottom = false;
      }
    });
  }

  private subscribeToUserDeletion() {
    const global$ = (window as any).__otoUserInfoDeleted$ as any;
    if (global$ && typeof global$.pipe === 'function') {
      global$
        .pipe(takeUntil(this.destroy$), filter((info: any) => info?.userName === this.chatNickName))
        .subscribe(() => this.handleChatUserDeleted());
    }
  }

  private handleChatUserDeleted() {
    this.messages = [];
    this.chatUserDeleted.emit();
  }

  private loadMore() {
    if (this.loading || this.allLoaded) return;
    this.loading = true;
    
    // Use passed loadHistory function or fallback to global variable
    const loadHistoryFn = this.loadHistory || (window as any).__otoLoadHistory as ((nick: string, take: number, skip: number) => any) | undefined;
    
    if (!loadHistoryFn) {
      this.loading = false;
      return;
    }
    
    loadHistoryFn(this.chatNickName, this.take, this.skip)
      .pipe(takeUntil(this.destroy$))
      .subscribe((newMsgs: OtoMessage[]) => {
        const filtered = newMsgs.filter(m => !m.isDeleted || !this.isMyMessage(m));
        const existingIds = new Set(this.messages.map(m => m.messageId));
        const unique = filtered.filter(m => !existingIds.has(m.messageId));
        if (unique.length === 0) {
          this.allLoaded = true;
        } else {
          this.messages = [...unique, ...this.messages];
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

  isMyMessage(msg: OtoMessage): boolean {
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
  }

  isMessageDeleted(msg: OtoMessage): boolean {
    return msg.isDeleted === true;
  }

  getMessageContent(msg: OtoMessage): string {
    if (msg.isDeleted) return msg.content;
    if (msg.isDeleted) return 'This message was deleted';
    return msg.content;
  }

  clearMessagesForDeletedUser(): void {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
  }
}


