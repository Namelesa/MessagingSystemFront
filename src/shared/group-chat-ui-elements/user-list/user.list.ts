import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface User {
  nickName: string;
  image: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ul [ngClass]="listClass">
      <li *ngFor="let user of users" 
          class="flex items-center justify-between mb-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 cursor-pointer transition-colors"
          (click)="onUserClick(user)">
        <div class="flex items-center">
          <img [src]="user.image" alt="avatar" class="inline w-6 h-6 rounded-full mr-2" />
          {{ user.nickName }}
          
          <span *ngIf="user.nickName === adminNickname" 
                class="ml-2 text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
            Admin
          </span>
        </div>
        
        <button *ngIf="showRemoveButton(user.nickName)"
                (click)="onRemoveUser($event, user.nickName)"
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600 text-xs">
          ✖️
        </button>
      </li>
    </ul>
  `
})
export class UserListComponent {
  @Input() users: User[] = [];
  @Input() adminNickname = '';
  @Input() currentUserNickname = '';
  @Input() showRemoveButtons = false;
  @Input() variant: 'simple' | 'detailed' = 'simple';
  
  @Output() removeUser = new EventEmitter<string>();
  @Output() userClick = new EventEmitter<User>();
  
  get listClass(): string {
    return this.variant === 'simple' 
      ? 'list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-2'
      : 'text-sm text-gray-700 dark:text-gray-300 mb-2';
  }
  
  showRemoveButton(nickName: string): boolean {
    return this.showRemoveButtons && 
           nickName !== this.adminNickname && 
           this.adminNickname === this.currentUserNickname;
  }

  onUserClick(user: User): void {
    // Не открываем чат если это текущий пользователь
    if (user.nickName === this.currentUserNickname) {
      return;
    }
    this.userClick.emit(user);
  }

  onRemoveUser(event: Event, nickName: string): void {
    event.stopPropagation(); // Предотвращаем всплытие события клика
    this.removeUser.emit(nickName);
  }
}