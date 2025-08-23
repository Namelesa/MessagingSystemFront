import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageViewerItem } from '../service/image-viewer.model';

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./image-viewer.component.html",
  styles: [`
    :host {
      display: contents;
    }
    
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
  `]
})
export class ImageViewerComponent implements OnInit, OnDestroy {
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
Math: any;

  get currentImage(): ImageViewerItem | null {
    return this.images[this.currentIndex] || null;
  }

  ngOnInit() {
    this.currentIndex = Math.max(0, Math.min(this.initialIndex, this.images.length - 1));
  }

  ngOnDestroy() {
    // Clean up if needed
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.isVisible) return;
    
    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowLeft':
        this.previousImage();
        break;
      case 'ArrowRight':
        this.nextImage();
        break;
      case ' ':
        event.preventDefault();
        this.toggleZoom(event);
        break;
    }
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close() {
    this.isVisible = false;
    this.resetZoom();
    this.closed.emit();
  }

  previousImage() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.resetZoom();
    }
  }

  nextImage() {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
      this.resetZoom();
    }
  }

  toggleZoom(event: Event) {
    if (this.scale === 1) {
      this.scale = 2;
      // Center zoom on click position
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
    if (this.scale > 1) {
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

  onMouseUp() {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, this.scale + delta));
    
    if (newScale !== this.scale) {
      this.scale = newScale;
      if (this.scale === 1) {
        this.translateX = 0;
        this.translateY = 0;
      }
    }
  }

  getImageCursorClass(): string {
    if (this.scale === 1) {
      return 'cursor-zoom-in';
    } else if (this.isDragging) {
      return 'cursor-grabbing';
    } else {
      return 'cursor-grab';
    }
  }

  getImageTransform(): string {
    return `scale(${this.scale}) translate(${this.translateX}px, ${this.translateY}px)`;
  }

  downloadImage() {
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