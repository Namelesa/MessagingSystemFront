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
      <span *ngFor="let user of users" 
            class="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-3 py-1 rounded-full">
        <img [src]="user.image" alt="avatar" class="w-4 h-4 rounded-full mr-2" />
        {{ user.nickName }}
        <button (click)="removeUser.emit(user.nickName)"
                class="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100">
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