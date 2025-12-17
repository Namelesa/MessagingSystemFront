import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectedUser {
  nickName: string;
  image: string;
}

@Component({
  selector: 'app-selected-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="users.length > 0" class="flex flex-wrap gap-2 mt-3">
      <span 
        *ngFor="let user of users"
        class="inline-flex items-center bg-theme-secondary text-theme-primary text-xs px-3 py-1 rounded-full border border-theme transition-colors duration-300"
      >
        <img 
          [src]="user.image" 
          alt="avatar" 
          class="w-4 h-4 rounded-full mr-2 border border-theme object-cover"
        />
        {{ user.nickName }}
        <button 
          (click)="removeUser.emit(user.nickName)"
          class="ml-2 text-theme-accent hover:opacity-80 transition-opacity duration-200"
          aria-label="Remove user"
        >
          ✖
        </button>
      </span>
    </div>
  `
})
export class SelectedUsersComponent {
  @Input() users: SelectedUser[] = [];
  @Output() removeUser = new EventEmitter<string>();
}