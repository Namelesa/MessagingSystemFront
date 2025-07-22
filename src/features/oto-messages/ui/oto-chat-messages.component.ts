import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OtoChatApiService } from '../../../features/oto-chats/api/oto-chat-hub.api';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-oto-chat-messages',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #scrollContainer (scroll)="onScroll()" class="overflow-y-auto h-full relative scroll-smooth">
      <ng-container *ngFor="let group of groupedMessages">
        <div class="flex justify-center my-4">
          <span class="inline-block bg-gray-400 text-white px-3 py-1 rounded-full opacity-80 text-sm dark:bg-gray-500 dark:text-white shadow-md">
            {{ isToday(group.messages[0].sentAt) ? 'Today' : (group.messages[0].sentAt | date:'d MMMM yyyy') }}
          </span>
        </div>
        <ng-container *ngFor="let msg of group.messages; let i = index">
          <div class="flex flex-col mb-1 relative" [ngClass]="isMyMessage(msg) ? 'items-end' : 'items-start'">
            <div class="relative max-w-[75%]">
              <div
                class="px-3 py-2 rounded-2xl shadow-sm text-sm min-w-[48px] min-h-[32px]"
                [ngClass]="isMyMessage(msg)
                  ? 'ml-auto bg-blue-500 text-white rounded-br-md'
                  : 'mr-auto bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white rounded-bl-md'"
                style="word-break:break-word;"
              >
                <div class="whitespace-pre-line break-words">{{ msg.content }}</div>
                <div class="flex items-center gap-1 mt-1 text-xs justify-end"
                  [ngClass]="isMyMessage(msg)
                    ? 'text-blue-200 dark:text-gray-200'
                    : 'text-gray-500 dark:text-gray-200'">
                  <span>{{ msg.sentAt | date:'shortTime' }}</span>
                </div>
              </div>
              <!-- Новый SVG хвостик, маленький и плавный -->
              <svg *ngIf="isMyMessage(msg)" width="12" height="16" viewBox="0 0 12 16" class="absolute bottom-0 right-0 translate-x-1/2" style="z-index:1">
                <path d="M0,16 Q12,16 6,6 Q5,2 12,0" fill="#3B82F6"/>
              </svg>
              <svg *ngIf="!isMyMessage(msg)" width="12" height="16" viewBox="0 0 12 16" class="absolute bottom-0 left-0 -translate-x-1/2 fill-gray-200 dark:fill-gray-700" style="z-index:1">
                <path d="M12,16 Q0,16 6,6 Q7,2 0,0" />
              </svg>
            </div>
          </div>
        </ng-container>
      </ng-container>
    </div>
    <ng-template #loading>
      <div class="text-gray-400">Loading...</div>
    </ng-template>
  `
})
export class OtoChatMessagesComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() chatNickName!: string;
  @Input() currentUserNickName!: string;
  messages: any[] = [];
  take = 20;
  skip = 0;
  allLoaded = false;
  loading = false;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  private prevScrollHeight = 0;
  private signalRSub?: Subscription;

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 0);
  }

  onScroll() {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    console.log('scrollTop:', el.scrollTop, 'loading:', this.loading, 'allLoaded:', this.allLoaded);
    if (el.scrollTop < 300 && !this.loading && !this.allLoaded) {
      this.prevScrollHeight = el.scrollHeight;
      this.loadMore();
    }
  }

  scrollToBottom() {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }

  loadMore() {
    if (this.loading || this.allLoaded) return;
    this.loading = true;
    console.log('loadMore: skip', this.skip, 'take', this.take);
    this.api.loadChatHistory(this.chatNickName, this.take, this.skip).subscribe(newMsgs => {
      console.log('loadMore: newMsgs', newMsgs);
      if (newMsgs.length < this.take) this.allLoaded = true;
      const existingIds = new Set(this.messages.map(m => m.messageId));
      const uniqueNewMsgs = newMsgs.filter(m => !existingIds.has(m.messageId));
      this.messages = [...this.messages, ...uniqueNewMsgs];
      this.skip = this.messages.length;
      this.loading = false;
      setTimeout(() => {
        if (this.scrollContainer) {
          const el = this.scrollContainer.nativeElement;
          el.scrollTo({ top: el.scrollHeight - this.prevScrollHeight, behavior: 'smooth' });
        }
      });
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['chatNickName'] && this.chatNickName) {
      this.messages = [];
      this.skip = 0;
      this.allLoaded = false;
      this.loadMore();

      if (this.signalRSub) this.signalRSub.unsubscribe();
      this.signalRSub = this.api.messages$.subscribe(newMsgs => {
        for (const msg of newMsgs) {
          if (!this.messages.some(m => m.messageId === msg.messageId)) {
            this.messages = [...this.messages, msg];
          }
        }
        this.messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
        this.skip = this.messages.length;
      });
    }
  }

  ngOnDestroy() {
    if (this.signalRSub) this.signalRSub.unsubscribe();
  }

  get groupedMessages() {
    const sorted = this.messages.slice().sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    const groups: { date: string, messages: any[] }[] = [];
    let lastDate = '';
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
  
  constructor(private api: OtoChatApiService) {}

  isMyMessage(msg: any): boolean {
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
  }

  isToday(date: string | Date): boolean {
    const d = new Date(date);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  }

  shouldShowDate(msg: any, messages: any[], i: number): boolean {
    const msgDate = new Date(msg.sentAt).toDateString();
    if (i === 0) return true;
    const prevDate = new Date(messages[i - 1].sentAt).toDateString();
    return msgDate !== prevDate;
  }
} 