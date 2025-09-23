import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'file-drop-overlay',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div *ngIf="isVisible" 
         class="fixed inset-0 bg-blue-500/20 backdrop-blur-sm border-4 border-dashed border-blue-400 flex items-center justify-center z-50 pointer-events-none">
      <div class="text-center bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md mx-4">
        <svg class="w-20 h-20 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        <h3 class="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">{{ 'sendMessageArea.dropFile' | translate }}</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm">{{ 'sendMessageArea.dropFileSubtitle' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 50;
      pointer-events: none;
    }
  `]
})
export class FileDropOverlayComponent {
  @Input() isVisible = false;
}
