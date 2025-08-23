import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { OtoMessage } from '../../../entities/oto-message';
import { isToday, truncateText, computeContextMenuPosition } from '../../../shared/chat';
import { FileUploadApiService } from '../../../features/file-sender';
import { ImageViewerComponent, ImageViewerItem } from '../../../shared/image-viewer';

@Component({
  selector: 'widgets-oto-chat-messages',
  standalone: true,
  imports: [CommonModule, ImageViewerComponent],
  templateUrl: './oto-chat-messages.widget.html',
})
export class OtoChatMessagesWidget implements OnChanges, AfterViewInit, OnDestroy {
  @Input() chatNickName!: string;
  @Input() currentUserNickName!: string;
  @Input() messages$?: Observable<OtoMessage[]>;
  @Input() userInfoDeleted$?: Observable<{ userName: string }>;
  @Input() loadHistory?: (nick: string, take: number, skip: number) => Observable<OtoMessage[]>;

  @Output() editMessage = new EventEmitter<OtoMessage>();
  @Output() deleteMessage = new EventEmitter<OtoMessage>();
  @Output() replyToMessage = new EventEmitter<OtoMessage>();
  @Output() chatUserDeleted = new EventEmitter<void>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  showImageViewer = false;
  imageViewerImages: ImageViewerItem[] = [];
  imageViewerInitialIndex = 0;

  constructor(private fileUploadApi: FileUploadApiService) {}

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

  parseContent(msg: OtoMessage): { text: string; files: any[] } {
    if ((msg as any).parsedContent) {
      return (msg as any).parsedContent;
    }
    
    try {
      const parsed = JSON.parse(msg.content);
      const filesWithType = (parsed.files || []).map((file: any) => {
        return file;
      });
      
      const result = {
        text: parsed.text || '',
        files: filesWithType
      };
      
      return result;
    } catch (error) {
      if (msg.content && typeof msg.content === 'string') {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const isImageUrl = imageExtensions.some(ext => 
          msg.content.toLowerCase().includes(ext) || 
          msg.content.toLowerCase().includes('image/')
        );
        
        if (isImageUrl) {
          return {
            text: '',
            files: [{
              url: msg.content,
              fileName: msg.content.split('/').pop() || 'image',
              type: 'image/jpeg'
            }]
          };
        }
      }
      
      return { text: msg.content, files: [] };
    }
  }

  openImageViewer(clickedImageUrl: string, messageId: string) {
    const allImages: ImageViewerItem[] = [];
    
    for (const msg of this.messages) {
      const content = this.parseContent(msg);
      const images = content.files.filter(file => file.type?.startsWith('image/'));
      
      for (const image of images) {
        allImages.push({
          url: image.url,
          fileName: image.fileName,
          messageId: msg.messageId,
          sender: msg.sender
        });
      }
    }

    const clickedIndex = allImages.findIndex(img => img.url === clickedImageUrl);
    
    if (clickedIndex !== -1) {
      this.imageViewerImages = allImages;
      this.imageViewerInitialIndex = clickedIndex;
      this.showImageViewer = true;
    }
  }

  onImageViewerClosed() {
    this.showImageViewer = false;
    this.imageViewerImages = [];
    this.imageViewerInitialIndex = 0;
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

  trackByGroup(index: number, group: { date: string; messages: OtoMessage[] }): string {
    return group.date;
  }

  trackByMessageId(index: number, msg: OtoMessage): string {
    return msg.messageId;
  }

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

    if (!this.messages$) return;
    this.messages$.pipe(takeUntil(this.destroy$)).subscribe((newMsgs: OtoMessage[]) => {
      const filtered = newMsgs.filter(msg => !msg.isDeleted || !this.isMyMessage(msg));
      const newMap = new Map(filtered.map(m => [m.messageId, m]));
      const oldMap = new Map(this.messages.map(m => [m.messageId, m]));
      for (const m of filtered) oldMap.set(m.messageId, m);
      for (const id of Array.from(oldMap.keys())) if (!newMap.has(id)) oldMap.delete(id);
      this.messages = Array.from(oldMap.values()).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      this.loadAllFileDownloadUrls(this.messages);
      this.skip = this.messages.length;
      if (this.isScrolledToBottom() || this.shouldScrollToBottom) {
        setTimeout(() => this.scrollToBottom(), 0);
        this.shouldScrollToBottom = false;
      }
    });
  }

  private async loadAllFileDownloadUrls(messages: OtoMessage[]) {
    const fileNames = messages.flatMap(msg => {
      const parsed = this.parseContent(msg);
      return parsed.files.map(f => f.fileName);
    });
  
    if (fileNames.length === 0) return;
  
    try {
      const urls = await this.fileUploadApi.getDownloadUrls(fileNames);
      const urlMap = new Map(urls.map(f => [f.fileName, f.url]));
  
      for (const msg of this.messages) {
        const parsed = this.parseContent(msg);
        let hasChanges = false;
  
        const updatedFiles = parsed.files.map(f => {
          const newUrl = urlMap.get(f.fileName);
          if (newUrl && newUrl !== f.url) {
            hasChanges = true;
            f.url = newUrl; 
          }
          return f;
        });
  
        if (hasChanges) {
          parsed.files = updatedFiles;
          (msg as any).parsedContent = {
            text: parsed.text,
            files: updatedFiles
          };
        }
      }
  
    } catch (err) {
      console.error('Failed to fetch download URLs', err);
    }
  }

  private subscribeToUserDeletion() {
    const global$ = this.userInfoDeleted$;
    if (global$) {
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
    const loadHistory = this.loadHistory;
    if (!loadHistory) {
      this.loading = false;
      return;
    }
    loadHistory(this.chatNickName, this.take, this.skip)
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
          this.loadAllFileDownloadUrls(this.messages);
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