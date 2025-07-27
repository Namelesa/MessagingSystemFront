import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat.page.layout.html',
})
export class ChatLayoutComponent {
  @Input() selectedChat?: string;
  @Input() selectedChatImage?: string;
  @Input() groupId?: string;
  @Output() headerClick = new EventEmitter<void>();
}
