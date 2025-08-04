import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BaseMessage {
  messageId?: string;
  id?: string;
  sender: string;
  content: string;
}

@Component({
  selector: 'shared-send-message-area',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-message-area.component.html',
})
export class SendAreaComponent implements OnChanges {
  @Output() send = new EventEmitter<string>();
  @Output() editComplete = new EventEmitter<{ messageId: string; content: string }>();
  @Output() editCancel = new EventEmitter<void>();
  @Output() replyCancel = new EventEmitter<void>();
  
  @Input() editingMessage?: BaseMessage;
  @Input() replyingToMessage?: BaseMessage;

  message = '';
  readonly maxLength = 2000;
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['editingMessage']) {
      if (this.editingMessage) {
        this.message = this.editingMessage.content;
      } else if (!this.replyingToMessage) {
        this.message = '';
      }
    }
    
    if (changes['replyingToMessage']) {
      if (!this.replyingToMessage && !this.editingMessage) {
        this.message = '';
      }
    }
  }
  
  get warningThreshold(): number {
    return this.maxLength - 100;
  }

  get messageLength(): number {
    return this.message.length;
  }

  get showCounter(): boolean {
    return this.messageLength >= this.warningThreshold;
  }

  get isTooLong(): boolean {
    return this.messageLength > this.maxLength;
  }

  get remainingMessage(): string {
    return `${this.messageLength}/${this.maxLength}`;
  }

  get remainingChars(): string {
    const remaining = this.maxLength - this.messageLength;
    return remaining >= 0 ? `${remaining}` : `${remaining}`;
  }

  get isEditing(): boolean {
    return !!this.editingMessage;
  }

  get isReplying(): boolean {
    return !!this.replyingToMessage;
  }

  get placeholderText(): string {
    if (this.isEditing) return 'Edit Message...';
    if (this.isReplying) return `Reply to ${this.replyingToMessage?.sender}...`;
    return 'Send message...';
  }

  emitMessage() {
    const text = this.message.trim();
    if (!text || this.isTooLong) return;

    if (this.isEditing && this.editingMessage) {
      this.editComplete.emit({
        messageId: (this.editingMessage.messageId || this.editingMessage.id)!,
        content: text
      });
    } else {
      this.send.emit(text);
    }
    
    this.message = '';
  }

  cancelEdit() {
    this.editCancel.emit();
    this.message = '';
  }

  cancelReply() {
    this.replyCancel.emit();
    this.message = '';
  }
  
  truncateText(text: string, maxLength: number = 50): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}