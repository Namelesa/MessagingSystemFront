import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center mb-4 relative">
      <div 
        class="relative rounded-full overflow-hidden border border-theme transition-colors duration-300"
        [ngClass]="sizeClass"
      >
        <img
          *ngIf="src; else placeholder"
          [src]="src"
          [alt]="alt"
          class="w-full h-full object-cover rounded-full select-none"
        />

        <ng-template #placeholder>
          <div class="w-full h-full flex items-center justify-center bg-theme-secondary text-theme-primary rounded-full select-none">
            {{ alt ? alt.charAt(0).toUpperCase() : '?' }}
          </div>
        </ng-template>

        <label
          *ngIf="editable"
          [for]="inputId"
          class="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center text-white text-xs opacity-0 hover:opacity-100 cursor-pointer transition-opacity duration-300 backdrop-blur-[1px]"
        >
          <span class="select-none">Change</span>
        </label>

        <input
          *ngIf="editable"
          type="file"
          [id]="inputId"
          (change)="onFileChange($event)"
          accept="image/*"
          class="hidden"
        />
      </div>
    </div>
  `
})
export class AvatarComponent {
  @Input() src = '';
  @Input() alt = 'Avatar';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() editable = false;
  @Input() inputId = 'avatarInput';

  @Output() fileChange = new EventEmitter<Event>();

  get sizeClass(): string {
    switch (this.size) {
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-20 h-20';
      case 'lg': return 'w-32 h-32';
      default: return 'w-20 h-20';
    }
  }

  onFileChange(event: Event): void {
    this.fileChange.emit(event);
  }
}