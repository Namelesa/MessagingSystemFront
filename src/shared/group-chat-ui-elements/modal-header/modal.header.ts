import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold">{{ title }}</h2>

      <div class="flex gap-2">
        <button
          *ngIf="showEditButton"
          (click)="editClick.emit()"
          class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-600 transition-colors duration-200"
          aria-label="Edit">
          ✏️
        </button>
        
        <button
          *ngIf="showSaveButton"
          (click)="saveClick.emit()"
          [disabled]="saveDisabled"
          class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-600 transition disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        
        <button
          *ngIf="showCancelButton"
          (click)="cancelClick.emit()"
          class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600 transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  `
})
export class ModalHeaderComponent {
  @Input() title = '';
  @Input() showEditButton = false;
  @Input() showSaveButton = false;
  @Input() showCancelButton = false;
  @Input() saveDisabled = false;
  
  @Output() editClick = new EventEmitter<void>();
  @Output() saveClick = new EventEmitter<void>();
  @Output() cancelClick = new EventEmitter<void>();
}