import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OtoChatListComponent } from '../../../features/oto-chats';
import { OtoChatApiService } from '../../../features/oto-chats';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-oto-chat-page',
  standalone: true,
  imports: [CommonModule, OtoChatListComponent, FormsModule],
  templateUrl: './oto-chat-page.html',
})
export class OtoChatPageComponent implements OnInit {
  accessToken?: string;
  selectedChat?: string;
  selectedChatImage?: string;

  constructor(private otoChatApi: OtoChatApiService) {}

  ngOnInit() {
    this.otoChatApi.connect();
  }

  onChatSelected(nickname: string, image: string): void {
    this.selectedChat = nickname;
    this.selectedChatImage = image;
  }
}
