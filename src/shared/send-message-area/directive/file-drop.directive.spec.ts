import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FileDropDirective } from './file-drop.directive';

@Component({
    standalone: true,
    imports: [FileDropDirective],
  template: `<div fileDrop
                  (fileDrop)="onFileDrop($event)"
                  (dragStateChange)="onDragStateChange($event)"></div>`
})
class TestHostComponent {
  droppedFiles: File[] | null = null;
  dragState: boolean | null = null;

  onFileDrop(files: File[]) {
    this.droppedFiles = files;
  }

  onDragStateChange(state: boolean) {
    this.dragState = state;
  }
}

describe('FileDropDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let div: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();
  
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    div = fixture.debugElement.query(By.directive(FileDropDirective)).nativeElement;
    fixture.detectChanges();
  });

  function createDragEvent(type: string, init: any = {}): DragEvent {
    const event = new DragEvent(type, { bubbles: true, cancelable: true });
  
    spyOn(event, 'preventDefault').and.callThrough();
  
    if (init.dataTransfer) {
      Object.defineProperty(event, 'dataTransfer', {
        value: init.dataTransfer
      });
    }
    if (init.clientX !== undefined) {
      Object.defineProperty(event, 'clientX', { value: init.clientX });
    }
    if (init.clientY !== undefined) {
      Object.defineProperty(event, 'clientY', { value: init.clientY });
    }
  
    return event;
  }
  

  it('should emit true on dragenter', () => {
    const event = createDragEvent('dragenter');
    div.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(host.dragState).toBeTrue();
  });

  it('should emit false when dragleave reduces counter to 0', () => {
    const enter = createDragEvent('dragenter');
    div.dispatchEvent(enter);

    const leave = createDragEvent('dragleave');
    div.dispatchEvent(leave);

    expect(leave.preventDefault).toHaveBeenCalled();
    expect(host.dragState).toBeFalse();
  });

  it('should call preventDefault on dragover', () => {
    const event = createDragEvent('dragover');
    div.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should emit files on drop and reset state', () => {
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const dataTransfer = { files: [mockFile] } as unknown as DataTransfer;
  
    const event = createDragEvent('drop', { dataTransfer });
    div.dispatchEvent(event);
  
    expect(event.preventDefault).toHaveBeenCalled();
    expect(host.dragState).toBeFalse();
    expect(host.droppedFiles).toEqual([mockFile]);
  });
  
  it('should reset drag state on document dragleave with (0,0)', () => {
    div.dispatchEvent(createDragEvent('dragenter'));
  
    const docLeave = createDragEvent('dragleave', { clientX: 0, clientY: 0 });
    document.dispatchEvent(docLeave);
  
    expect(host.dragState).toBeFalse();
  });  
});
