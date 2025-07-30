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
          class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
          aria-label="Edit">
          ✏️
        </button>
        
        <!-- Save button -->
        <button
          *ngIf="showSaveButton"
          (click)="saveClick.emit()"
          [disabled]="saveDisabled"
          class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-600 transition disabled:opacity-50">
          ✔️
        </button>
        
        <!-- Cancel button -->
        <button
          *ngIf="showCancelButton"
          (click)="cancelClick.emit()"
          class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600 transition">
          ❌
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