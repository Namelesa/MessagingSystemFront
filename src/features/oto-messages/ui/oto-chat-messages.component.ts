import {
    Component,
    Input,
    OnChanges,
    SimpleChanges,
    ViewChild,
    ElementRef,
    AfterViewInit,
    OnDestroy
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { OtoChatApiService } from '../../../features/oto-chats/api/oto-chat-hub.api';
  import { Subject } from 'rxjs';
  import { takeUntil } from 'rxjs/operators';
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
  
    @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  
    messages: OtoMessage[] = [];
    take = 20;
    skip = 0;
    allLoaded = false;
    loading = false;
    private prevScrollHeight = 0;
  
    private destroy$ = new Subject<void>();
  
    constructor(private api: OtoChatApiService) {}
  
    ngAfterViewInit() {
      setTimeout(() => this.scrollToBottom(), 0);
    }
  
    ngOnChanges(changes: SimpleChanges) {
      if (changes['chatNickName'] && this.chatNickName) {
        this.initChat();
      }
    }
  
    ngOnDestroy() {
      this.destroy$.next();
      this.destroy$.complete();
    }
  
    private initChat() {
      this.messages = [];
      this.skip = 0;
      this.allLoaded = false;
      this.loadMore();
  
      this.api.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(newMsgs => {
        let updated = false;
    
        for (const msg of newMsgs) {
          const isForCurrentChat =
            (msg.sender === this.currentUserNickName && msg.recipient === this.chatNickName) ||
            (msg.sender === this.chatNickName && msg.recipient === this.currentUserNickName);
    
          if (isForCurrentChat && !this.messages.some(m => m.messageId === msg.messageId)) {
            this.messages.push(msg);
            updated = true;
          }
        }
    
        if (updated) {
          this.messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
          this.skip = this.messages.length;
    
          if (this.isScrolledToBottom()) {
            setTimeout(() => this.scrollToBottom(), 0);
          }
        }
      });
    }
  
    onScroll() {
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
      const el = this.scrollContainer.nativeElement;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  
    private loadMore() {
      if (this.loading || this.allLoaded) return;
      this.loading = true;
  
      this.api.loadChatHistory(this.chatNickName, this.take, this.skip)
        .pipe(takeUntil(this.destroy$))
        .subscribe(newMsgs => {
          if (newMsgs.length < this.take) this.allLoaded = true;
  
          const existingIds = new Set(this.messages.map(m => m.messageId));
          const uniqueNewMsgs = newMsgs.filter(m => !existingIds.has(m.messageId));
  
          this.messages = [...uniqueNewMsgs, ...this.messages];
          this.skip = this.messages.length;
          this.loading = false;
  
          setTimeout(() => {
            const el = this.scrollContainer.nativeElement;
            el.scrollTop = el.scrollHeight - this.prevScrollHeight;
          });
        });
    }
  
    get groupedMessages() {
      const groups: { date: string; messages: OtoMessage[] }[] = [];
      let lastDate = '';
      const sorted = [...this.messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  
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
      return msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
    }
  
    isToday(date: string | Date): boolean {
      const d = new Date(date);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }
  }