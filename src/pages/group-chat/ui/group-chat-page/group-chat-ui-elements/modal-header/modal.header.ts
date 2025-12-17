import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-between border-b border-theme pb-3 mb-4">
      <h2 class="text-xl font-semibold text-theme-primary transition-colors duration-300">
        {{ title }}
      </h2>

      <div class="flex gap-2 items-center">
        <button
          *ngIf="showEditButton"
          (click)="editClick.emit()"
          class="text-theme-accent hover:opacity-80 transition-opacity duration-200"
          aria-label="Edit"
        >
          ✏️
        </button>

        <button
          *ngIf="showSaveButton"
          (click)="saveClick.emit()"
          [disabled]="saveDisabled"
          class="text-theme-accent hover:opacity-80 transition-opacity duration-200 disabled:opacity-40"
          aria-label="Save"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <button
          *ngIf="showCancelButton"
          (click)="cancelClick.emit()"
          class="text-red-500 hover:opacity-80 transition-opacity duration-200"
          aria-label="Cancel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
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