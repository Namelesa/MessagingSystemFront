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
      <li 
        *ngFor="let user of users" 
        class="flex items-center justify-between mb-1 py-2 px-3 rounded-lg cursor-pointer 
               hover:bg-theme-hover transition-colors duration-200"
        (click)="onUserClick(user)"
      >
        <div class="flex items-center text-theme-primary">
          <img 
            [src]="user.image" 
            alt="avatar" 
            class="inline w-6 h-6 rounded-full mr-2 border border-theme object-cover"
          />

          <span class="font-medium">{{ user.nickName }}</span>

          <span 
            *ngIf="user.nickName === adminNickname"
            class="ml-2 text-xs font-medium bg-theme-warning/20 text-theme-warning px-2 py-0.5 rounded-full"
          >
            Admin
          </span>
        </div>
        
        <button 
          *ngIf="showRemoveButton(user.nickName)"
          (click)="onRemoveUser($event, user.nickName)"
          class="text-theme-danger hover:opacity-80 transition-opacity text-xs font-semibold"
          aria-label="Remove user"
        >
          ✖
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
      ? 'text-sm text-theme-secondary mb-2'
      : 'text-sm text-theme-secondary mb-2 space-y-1';
  }
  
  showRemoveButton(nickName: string): boolean {
    return (
      this.showRemoveButtons &&
      nickName !== this.adminNickname &&
      this.adminNickname === this.currentUserNickname
    );
  }

  onUserClick(user: User): void {
    if (user.nickName === this.currentUserNickname) return;
    this.userClick.emit(user);
  }

  onRemoveUser(event: Event, nickName: string): void {
    event.stopPropagation();
    this.removeUser.emit(nickName);
  }
}
