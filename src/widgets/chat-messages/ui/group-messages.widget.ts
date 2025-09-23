import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GroupMessage } from '../../../entities/group-message';
import { FileUploadApiService } from '../../../features/file-sender';
import { isToday, truncateText, computeContextMenuPosition } from '../../../shared/realtime';

@Component({
  selector: 'widgets-group-messages',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './group-messages.widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupMessagesWidget implements OnChanges, AfterViewInit, OnDestroy {
  @Input() groupId!: string;
  @Input() members: { nickName: string; image: string }[] = [];
  @Input() currentUserNickName!: string;
  @Input() messages$!: Observable<GroupMessage[]>;
  @Input() userInfoChanged$!: Observable<{ userName: string; image?: string; updatedAt: string; oldNickName: string }>;
  @Input() loadHistory!: (groupId: string, take: number, skip: number) => Observable<GroupMessage[]>;

  @Output() editMessage = new EventEmitter<GroupMessage>();
  @Output() deleteMessage = new EventEmitter<GroupMessage>();
  @Output() replyToMessage = new EventEmitter<GroupMessage>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  messages: GroupMessage[] = [];
  private localMembers: { nickName: string; image: string }[] = [];

  take = 20;
  skip = 0;
  allLoaded = false;
  loading = false;
  private prevScrollHeight = 0;
  contextMenuMessageId: string | null = null;
  contextMenuPosition = { x: 0, y: 0 };
  showContextMenu = false;
  highlightedMessageId: string | null = null;

  // Can be shared
  isMessageHighlighted(id: string): boolean {
    return this.highlightedMessageId === id;
  }

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;
  private avatarCache = new Map<string, string | undefined>();
  private hideContextMenuHandler?: () => void;

  constructor(private cdr: ChangeDetectorRef) {}

  // Can be abstracted
  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 0);
    const hideContextMenu = () => (this.showContextMenu = false);
    document.addEventListener('click', hideContextMenu);
    this.hideContextMenuHandler = hideContextMenu;
    this.subscribeToUserInfoUpdates();
  }

  // Can be abstracted or shared
  ngOnChanges(changes: SimpleChanges) {
    if (changes['groupId'] && this.groupId) {
      this.initChat();
    }
    if (changes['members'] && this.members) {
      this.localMembers = [...this.members];
      this.clearAvatarCache();
      this.cdr.markForCheck();
    }
  }

  // Can be shared
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.hideContextMenuHandler) {
      document.removeEventListener('click', this.hideContextMenuHandler);
    }
  }

  private subscribeToUserInfoUpdates() {
    this.userInfoChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userInfo => {
        if (userInfo) this.handleUserInfoUpdate(userInfo);
      });

    this.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        const uniqueSenders = [...new Set(messages.map(m => m.sender))];
        const missing = uniqueSenders.filter(s => !this.localMembers.some(m => m.nickName === s));
        if (missing.length > 0) {
        }
      });
  }

  private handleUserInfoUpdate(userInfo: { userName: string; image?: string; updatedAt: string; oldNickName: string }) {
    this.clearAvatarCache({ oldNick: userInfo.oldNickName, newNick: userInfo.userName });
    this.updateMessagesSenders(userInfo);
    this.updateLocalMembers(userInfo);
    this.cdr.detectChanges();
  }

  private updateMessagesSenders(userInfo: { userName: string; image?: string; updatedAt: string; oldNickName: string }) {
    this.messages = this.messages.map(msg =>
      msg.sender === userInfo.oldNickName
        ? { ...msg, sender: userInfo.userName, oldSender: userInfo.oldNickName, senderImage: userInfo.image || (msg as any).senderImage }
        : msg
    );
  }

  private updateLocalMembers(userInfo: { userName: string; image?: string; updatedAt: string; oldNickName: string }) {
    const cleanOld = userInfo.oldNickName.trim().toLowerCase();
    const cleanNew = userInfo.userName.trim().toLowerCase();
    let index = this.localMembers.findIndex(m => m.nickName.toLowerCase().trim() === cleanOld || m.nickName.toLowerCase().trim() === cleanNew);
    const image = userInfo.image?.trim() || '';
    if (index !== -1) {
      this.localMembers[index] = { nickName: userInfo.userName, image };
    } else {
      this.localMembers.push({ nickName: userInfo.userName, image });
    }
    this.avatarCache.delete(cleanOld);
    if (image) this.avatarCache.set(cleanNew, image); else this.avatarCache.set(cleanNew, undefined);
  }

  private clearAvatarCache(specific?: { oldNick?: string; newNick?: string }) {
    if (specific) {
      if (specific.oldNick) this.avatarCache.delete(specific.oldNick.trim().toLowerCase());
      if (specific.newNick) this.avatarCache.delete(specific.newNick.trim().toLowerCase());
    } else {
      this.avatarCache.clear();
    }
  }

  get groupedMessages() {
    const groups: { date: string; messages: GroupMessage[] }[] = [];
    let lastDate = '';
    const filtered = this.messages.filter(m => !m.isDeleted || this.isMyMessage(m));
    const sorted = [...filtered].sort((a, b) => new Date(a.sendTime).getTime() - new Date(b.sendTime).getTime());
    for (const msg of sorted) {
      const d = new Date(msg.sendTime).toDateString();
      if (d !== lastDate) { groups.push({ date: d, messages: [msg] }); lastDate = d; }
      else { groups[groups.length - 1].messages.push(msg); }
    }
    return groups;
  }

  trackByGroup = (_: number, group: { date: string; messages: GroupMessage[] }) => group.date;
  trackByMessageId = (_: number, msg: GroupMessage) => msg.id;

  isToday = isToday;
  truncateText = truncateText;

  // Can be abstracted or shared
  onScroll() {
    if (this.showContextMenu) this.showContextMenu = false;
    if (!this.scrollContainer || this.loading || this.allLoaded) return;
    const el = this.scrollContainer.nativeElement;
    if (el.scrollTop < 300) {
      this.prevScrollHeight = el.scrollHeight;
      this.loadMore();
    }
  }

  // Can be abstracted or shared
  scrollToMessage(messageId: string) {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
    if (!el) {
      setTimeout(() => {
        const retry = this.scrollContainer!.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
        if (retry) { retry.scrollIntoView({ behavior: 'smooth', block: 'center' }); this.highlightMessage(messageId); }
      }, 1000);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => this.highlightMessage(messageId), 300);
  }

  // Can be abstracted or shared
  getRepliedMessage(messageId: string): GroupMessage | null {
    return this.messages.find(m => m.id === messageId) || null;
  }

  // Can be abstracted or shared
  onMessageRightClick(event: MouseEvent, msg: GroupMessage) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const messageContainer = target.closest('.message-container') as HTMLElement;
    if (!messageContainer || !this.scrollContainer) return;
    const messageBlock = messageContainer.querySelector('[class*="px-3 py-2 rounded-2xl"]') as HTMLElement;
    if (!messageBlock) return;
    const blockRect = messageBlock.getBoundingClientRect();
    const containerRect = this.scrollContainer.nativeElement.getBoundingClientRect();
    const pos = computeContextMenuPosition(blockRect, containerRect, this.isMyMessage(msg));
    this.contextMenuMessageId = msg.id;
    this.contextMenuPosition = pos;
    this.showContextMenu = true;
  }

  // Can be abstracted or shared
  onEditMessage() {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (msg) this.editMessage.emit(msg);
    this.showContextMenu = false;
  }

  // Can be abstracted or shared
  onDeleteMessage() {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (msg) this.deleteMessage.emit(msg);
    this.showContextMenu = false;
  }

  // Can be abstracted or shared
  onReplyToMessage() {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (msg) this.replyToMessage.emit(msg);
    this.showContextMenu = false;
  }

  // Can be abstracted or shared
  canEditOrDelete(): boolean {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (!msg) return false;
    if (this.isMessageDeleted(msg)) return false;
    return this.isMyMessage(msg);
  }

  // Can be abstracted or shared
  private initChat() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.shouldScrollToBottom = true;
    this.loadMore();
    this.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(newMsgs => {
        const filtered = newMsgs.filter(m => !m.isDeleted || !this.isMyMessage(m));
        const newMap = new Map(filtered.map(m => [m.id, m]));
        const oldMap = new Map(this.messages.map(m => [m.id, m]));
        for (const m of filtered) oldMap.set(m.id, m);
        for (const id of Array.from(oldMap.keys())) if (!newMap.has(id)) oldMap.delete(id);
        this.messages = Array.from(oldMap.values()).sort((a, b) => new Date(a.sendTime).getTime() - new Date(b.sendTime).getTime());
        this.skip = this.messages.length;
        if (this.isScrolledToBottom() || this.shouldScrollToBottom) {
          setTimeout(() => this.scrollToBottom(), 0);
          this.shouldScrollToBottom = false;
        }
      });
  }

  // Can be abstracted or shared
  private loadMore() {
    if (this.loading || this.allLoaded) return;
    this.loading = true;
    this.loadHistory(this.groupId, this.take, this.skip)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newMsgs) => {
          const filtered = newMsgs.filter(m => !m.isDeleted || this.isMyMessage(m));
          const existingIds = new Set(this.messages.map(m => m.id));
          const unique = filtered.filter(m => !existingIds.has(m.id));
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
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  // Can be abstracted or shared
  private isScrolledToBottom(): boolean {
    if (!this.scrollContainer) return false;
    const el = this.scrollContainer.nativeElement;
    return el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
  }

  // Can be abstracted or shared
  private scrollToBottom() {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  // Can be abstracted or shared
  isMyMessage(msg: GroupMessage): boolean {
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
  }

  // Can be abstracted or shared
  isMessageDeleted(msg: GroupMessage): boolean {
    return msg.isDeleted === true;
  }

  getMessageContent(msg: GroupMessage): string {
    return msg.content;
  }

  getMemberAvatar(nick: string, oldNick?: string, forceRefresh = false): string | undefined {
    if (!nick) return undefined;
    const cleanNick = nick.trim().toLowerCase();
    const cleanOld = oldNick?.trim().toLowerCase();
    if (forceRefresh) {
      this.avatarCache.delete(cleanNick);
      if (cleanOld) this.avatarCache.delete(cleanOld);
    }
    if (!forceRefresh && this.avatarCache.has(cleanNick)) return this.avatarCache.get(cleanNick) ?? undefined;
    if (!forceRefresh && cleanOld && this.avatarCache.has(cleanOld)) {
      const cached = this.avatarCache.get(cleanOld);
      if (cached) { this.avatarCache.set(cleanNick, cached); return cached; }
    }
    const mLocal = this.localMembers.find(m => m.nickName.trim().toLowerCase() === cleanNick || (cleanOld && m.nickName.trim().toLowerCase() === cleanOld));
    if (mLocal?.image) { const image = mLocal.image.trim(); this.avatarCache.set(cleanNick, image); if (cleanOld) this.avatarCache.set(cleanOld, image); return image; }
    const mOriginal = this.members.find(m => m.nickName.trim().toLowerCase() === cleanNick || (cleanOld && m.nickName.trim().toLowerCase() === cleanOld));
    if (mOriginal?.image) { const image = mOriginal.image.trim(); this.avatarCache.set(cleanNick, image); if (cleanOld) this.avatarCache.set(cleanOld, image); return image; }
    if (this.localMembers.length > 0) { this.avatarCache.set(cleanNick, undefined); if (cleanOld) this.avatarCache.set(cleanOld, undefined); }
    return undefined;
  }

  getMessageAvatar(msg: GroupMessage): string | undefined {
    const oldSender = (msg as any).oldSender;
    const force = !!oldSender;
    return this.getMemberAvatar(msg.sender, oldSender, force);
  }

  shouldShowSenderName(messages: GroupMessage[], idx: number): boolean {
    if (idx === 0) return true;
    return messages[idx].sender !== messages[idx - 1].sender;
  }

  // Can be shared
  highlightMessage(messageId: string) {
    this.highlightedMessageId = null;
    this.highlightedMessageId = messageId;
    setTimeout(() => { if (this.highlightedMessageId === messageId) this.highlightedMessageId = null; }, 1500);
  }
}