import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

export interface FileDropEvent {
  files: File[];
  message?: string;
}

@Directive({
  selector: '[fileDrop]',
  standalone: true
})
export class FileDropDirective {
  @Output() fileDrop = new EventEmitter<File[]>();
  @Output() dragStateChange = new EventEmitter<boolean>();

  private dragCounter = 0;

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent) {
    event.preventDefault();
    this.dragCounter++;
    this.dragStateChange.emit(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.dragStateChange.emit(false);
    }
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragCounter = 0;
    this.dragStateChange.emit(false);

    if (event.dataTransfer?.files?.length) {
      this.fileDrop.emit(Array.from(event.dataTransfer.files));
    }
  }

  @HostListener('document:dragleave', ['$event'])
  onDocumentDragLeave(event: DragEvent) {
    if (event.clientX === 0 && event.clientY === 0) {
      this.dragCounter = 0;
      this.dragStateChange.emit(false);
    }
  }
}