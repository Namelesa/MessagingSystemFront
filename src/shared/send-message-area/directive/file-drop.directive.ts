import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

export interface FileDropEvent {
  files: File[];
  message?: string;
}

@Directive({
  selector: '[fileDrop]',
  standalone: true
})
export class FileDropDirective {
  @Output() fileDrop = new EventEmitter<FileDropEvent>();
  @Output() dragStateChange = new EventEmitter<boolean>();
  
  private dragCounter = 0;
  private isDragOver = false;

  constructor(private el: ElementRef) {}

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter++;
    
    if (!this.isDragOver) {
      this.isDragOver = true;
      this.dragStateChange.emit(true);
      this.el.nativeElement.classList.add('drag-over');
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter--;
    
    if (this.dragCounter === 0) {
      this.isDragOver = false;
      this.dragStateChange.emit(false);
      this.el.nativeElement.classList.remove('drag-over');
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    this.dragCounter = 0;
    this.dragStateChange.emit(false);
    this.el.nativeElement.classList.remove('drag-over');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.fileDrop.emit({
        files: Array.from(files)
      });
    }
  }

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }
}
