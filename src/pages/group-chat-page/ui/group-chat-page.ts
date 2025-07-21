import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupChatListComponent } from '../../../features/group-chats';
import { GroupChatApiService } from '../../../features/group-chats';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-chat-page',
  standalone: true,
  imports: [CommonModule, GroupChatListComponent, FormsModule],
  templateUrl: './group-chat-page.html',
})
export class GroupChatPageComponent implements OnInit {
  accessToken?: string;
  selectedChat?: string;
  selectedChatImage?: string;

  constructor(private groupChatApi: GroupChatApiService) {}

  ngOnInit() {
    this.groupChatApi.connect();
  }

  onChatSelected(nickname: string, image: string): void {
    this.selectedChat = nickname;
    this.selectedChatImage = image;
  }
}
