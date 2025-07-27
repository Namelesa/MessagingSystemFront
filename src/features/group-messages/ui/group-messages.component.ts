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
import { Subject } from 'rxjs'; 
import { takeUntil } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { GroupMessagesApiService } from '../api/group-messages.api';
import { GroupMessage } from '../model/group-message.model';
import { AuthService } from '../../../entities/user/api/auht.service';

@Component({
  selector: 'app-group-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-messages.component.html',
})
export class GroupMessagesComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() groupId?: string;
  @Input() members: { nickName: string; image: string }[] = [];
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  messages: GroupMessage[] = [];
  take = 20;
  skip = 0;
  allLoaded = false;
  loading = false;
  private prevScrollHeight = 0;
  private destroy$ = new Subject<void>();
  currentUserNickName: string;

  constructor(private api: GroupMessagesApiService, private authService: AuthService) {
    this.currentUserNickName = this.authService.getNickName() || '';
    this.api.messages$.subscribe(msgs => {
      this.messages = msgs;
      this.loading = false;
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.groupId && changes['groupId']) {
      this.loading = true;
      this.skip = 0;
      this.allLoaded = false;
      this.api.loadChatHistory(this.groupId, this.skip, this.take)
        .subscribe(); 
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.api.cleanup();
  }

  onScroll() {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    if (el.scrollTop < 300 && !this.loading && !this.allLoaded) {
      this.prevScrollHeight = el.scrollHeight;
      this.loadMore();
    }
  }

  private loadMore() {
    if (this.loading || this.allLoaded || !this.groupId) return;
    this.loading = true;

    const oldSkip = this.skip;
    this.skip += this.take;

    this.api.loadChatHistory(this.groupId, oldSkip, this.take)
      .pipe(takeUntil(this.destroy$))
      .subscribe(newMsgs => {
        if (newMsgs.length < this.take) this.allLoaded = true;

        const existingIds = new Set(this.messages.map(m => m.messageId));
        const uniqueNewMsgs = newMsgs.filter(m => !existingIds.has(m.messageId));

        if (uniqueNewMsgs.length > 0) {
          this.messages = [...uniqueNewMsgs, ...this.messages];

          setTimeout(() => {
            const el = this.scrollContainer.nativeElement;
            el.scrollTop = el.scrollHeight - this.prevScrollHeight;
          });
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
    const el = this.scrollContainer.nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  get groupedMessages() {
    const groups: { date: string; messages: GroupMessage[] }[] = [];
    let lastDate = '';
    const sorted = [...this.messages].sort((a, b) => new Date(a.sendTime).getTime() - new Date(b.sendTime).getTime());
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
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName?.trim().toLowerCase();
  }

  isToday(date: string | Date): boolean {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
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
} 