import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { ImageViewerItem } from '../service/image-viewer.model';

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-viewer.component.html',
  animations: [
    trigger('imageTransition', [
      transition('* => *', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ],
  styles: [`
    :host { display: contents; }
    @keyframes fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in { animation: fade-in 0.3s ease-out; }
    .border-3 { border-width: 3px; }
  `]
})
export class ImageViewerComponent implements OnInit {
  @Input() isVisible = false;
  @Input() images: ImageViewerItem[] = [];
  @Input() initialIndex = 0;
  @Output() closed = new EventEmitter<void>();

  currentIndex = 0;

  scale = 1;
  translateX = 0;
  translateY = 0;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private startX = 0;
  private startY = 0;

  Math: any = Math;

  ngOnInit() {
    this.currentIndex = Math.max(0, Math.min(this.initialIndex, this.images.length - 1));
  }

  get currentImage(): ImageViewerItem | null {
    return this.images[this.currentIndex] || null;
  }

  close() {
    this.isVisible = false;
    this.resetZoom();
    this.closed.emit();
  }

  previousImage() {
    if (this.currentIndex > 0) this.currentIndex--;
    this.resetZoom();
  }

  nextImage() {
    if (this.currentIndex < this.images.length - 1) this.currentIndex++;
    this.resetZoom();
  }

  goToImage(index: number) {
    if (index >= 0 && index < this.images.length) {
      this.currentIndex = index;
      this.resetZoom();
    }
  }

  toggleZoom(event: Event) {
    if (!this.currentImage?.url.startsWith('image/')) return;
    if (this.scale === 1) {
      this.scale = 2;
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const clickX = (event as MouseEvent).clientX - rect.left - rect.width / 2;
      const clickY = (event as MouseEvent).clientY - rect.top - rect.height / 2;
      this.translateX = -clickX;
      this.translateY = -clickY;
    } else {
      this.resetZoom();
    }
  }

  resetZoom() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
  }

  onMouseDown(event: MouseEvent) {
    if (this.scale > 1 && this.currentImage?.url.startsWith('image/')) {
      this.isDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      this.startX = this.translateX;
      this.startY = this.translateY;
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.scale > 1) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      this.translateX = this.startX + deltaX;
      this.translateY = this.startY + deltaY;
    }
  }

  onMouseUp() { this.isDragging = false; }

  getImageCursorClass(): string {
    if (!this.currentImage?.url.startsWith('image/')) return 'cursor-auto';
    if (this.scale === 1) return 'cursor-zoom-in';
    return this.isDragging ? 'cursor-grabbing' : 'cursor-grab';
  }

  getImageTransform(): string {
    if (!this.currentImage?.url.startsWith('image/')) return 'none';
    return `scale(${this.scale}) translate(${this.translateX}px, ${this.translateY}px)`;
  }

  downloadCurrent() {
    if (!this.currentImage) return;
    const link = document.createElement('a');
    link.href = this.currentImage.url;
    link.download = this.currentImage.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
