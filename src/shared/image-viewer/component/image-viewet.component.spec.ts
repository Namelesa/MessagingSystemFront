import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageViewerComponent } from './image-viewer.component';
import { ImageViewerItem } from '../service/image-viewer.model';

describe('ImageViewerComponent', () => {
  let component: ImageViewerComponent;
  let fixture: ComponentFixture<ImageViewerComponent>;

  const mockImages: ImageViewerItem[] = [
    { fileName: 'img1.jpg', url: '1.jpg', type: 'image/jpeg' },
    { fileName: 'video.mp4', url: '2.mp4', type: 'video/mp4' },
    { fileName: 'audio.mp3', url: '3.mp3', type: 'audio/mp3' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageViewerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ImageViewerComponent);
    component = fixture.componentInstance;
    component.images = mockImages;
    component.isVisible = true;
    fixture.detectChanges();
  });

  it('should set currentIndex within bounds on init', () => {
    component.initialIndex = 10;
    component.ngOnInit();
    expect(component.currentIndex).toBe(2);
  });

  it('should return currentImage', () => {
    component.currentIndex = 1;
    expect(component.currentImage?.fileName).toBe('video.mp4');
  });

  it('should close viewer and reset zoom', () => {
    component.scale = 2;
    component.translateX = 10;

    spyOn(component.closed, 'emit');

    component.close();

    expect(component.isVisible).toBeFalse();
    expect(component.scale).toBe(1);
    expect(component.translateX).toBe(0);
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('should pause and reset video on close if video file', () => {
    component.currentIndex = 1;

    const video = document.createElement('video');
    video.pause = jasmine.createSpy();
    video.currentTime = 5;

    spyOn(document, 'querySelector').and.returnValue(video);

    component.close();

    expect(video.pause).toHaveBeenCalled();
    expect(video.currentTime).toBe(0);
  });

  it('should go to previous image', () => {
    component.currentIndex = 1;
    component.previousImage();
    expect(component.currentIndex).toBe(0);
  });

  it('should not go before first image', () => {
    component.currentIndex = 0;
    component.previousImage();
    expect(component.currentIndex).toBe(0);
  });

  it('should go to next image', () => {
    component.currentIndex = 0;
    component.nextImage();
    expect(component.currentIndex).toBe(1);
  });

  it('should not go after last image', () => {
    component.currentIndex = 2;
    component.nextImage();
    expect(component.currentIndex).toBe(2);
  });

  it('should go to specific image index', () => {
    component.goToImage(2);
    expect(component.currentIndex).toBe(2);
  });

  it('should ignore invalid goToImage index', () => {
    component.goToImage(-5);
    expect(component.currentIndex).toBe(0);
  });

  it('should zoom in on image click', () => {
    component.currentIndex = 0;
  
    const event = {
      target: document.createElement('div'),
      clientX: 100,
      clientY: 100
    } as any;
  
    spyOn(event.target, 'getBoundingClientRect').and.returnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 200
    });
  
    component.toggleZoom(event);
  
    expect(component.scale).toBe(2);
    expect(component.translateX).toEqual(jasmine.any(Number)); 
    expect(component.translateY).toEqual(jasmine.any(Number)); 
  });
  

  it('should reset zoom if already zoomed in', () => {
    component.scale = 2;
    component.toggleZoom({} as any);
    expect(component.scale).toBe(1);
  });

  it('should start dragging on mouse down when zoomed in', () => {
    component.scale = 2;
    const event = new MouseEvent('mousedown', { clientX: 50, clientY: 60 });
    spyOn(event, 'preventDefault');

    component.onMouseDown(event);

    expect((component as any).isDragging).toBeTrue();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should move image on mouse move while dragging', () => {
    component.scale = 2;
    component['isDragging'] = true;
    component['lastMouseX'] = 10;
    component['lastMouseY'] = 10;
    component['startX'] = 0;
    component['startY'] = 0;

    const event = new MouseEvent('mousemove', { clientX: 20, clientY: 30 });

    component.onMouseMove(event);

    expect(component.translateX).toBe(10);
    expect(component.translateY).toBe(20);
  });

  it('should stop dragging on mouse up', () => {
    component['isDragging'] = true;
    component.onMouseUp();
    expect(component['isDragging']).toBeFalse();
  });

  it('should return cursor-auto for non-image', () => {
    component.currentIndex = 1; 
    expect(component.getImageCursorClass()).toBe('cursor-auto');
  });

  it('should return zoom-in cursor', () => {
    component.currentIndex = 0;
    component.scale = 1;
    expect(component.getImageCursorClass()).toBe('cursor-zoom-in');
  });

  it('should return grabbing / grab cursor', () => {
    component.currentIndex = 0;

    component.scale = 2;
    component['isDragging'] = true;
    expect(component.getImageCursorClass()).toBe('cursor-grabbing');

    component['isDragging'] = false;
    expect(component.getImageCursorClass()).toBe('cursor-grab');
  });

  it('should return none for non-image', () => {
    component.currentIndex = 1;
    expect(component.getImageTransform()).toBe('none');
  });

  it('should return correct transform for image', () => {
    component.currentIndex = 0;
    component.scale = 2;
    component.translateX = 10;
    component.translateY = -5;

    expect(component.getImageTransform())
      .toBe('scale(2) translate(10px, -5px)');
  });

  it('should detect image type', () => {
    component.currentIndex = 0;
    expect(component.isImageFile()).toBeTrue();
  });

  it('should detect video type', () => {
    component.currentIndex = 1;
    expect(component.isVideoFile()).toBeTrue();
  });

  it('should detect audio type', () => {
    component.currentIndex = 2;
    expect(component.isAudioFile()).toBeTrue();
  });

  it('should skip download if no current image', () => {
    component.images = [];
    expect(() => component.downloadCurrent()).not.toThrow();
  });

  it('should download current file', () => {
    component.currentIndex = 0;
  
    const link = document.createElement('a');
    spyOn(document, 'createElement').and.returnValue(link);
    spyOn(link, 'click');
  
    component.downloadCurrent();
  
    expect(link.href).toContain('1.jpg'); 
    expect(link.download).toBe('img1.jpg');
    expect(link.click).toHaveBeenCalled();
  });
  
  it('should close on Escape key', () => {
    spyOn(component, 'close');

    component.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.close).toHaveBeenCalled();
  });

  it('should move left on ArrowLeft', () => {
    component.currentIndex = 1;
    spyOn(component, 'previousImage');
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(component.previousImage).toHaveBeenCalled();
  });

  it('should move right on ArrowRight', () => {
    component.currentIndex = 1;
    spyOn(component, 'nextImage');
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(component.nextImage).toHaveBeenCalled();
  });

  it('should return early in toggleZoom when current file is not an image', () => {
    component.images = [
      { fileName: 'video.mp4', url: 'v.mp4', type: 'video/mp4' }
    ];
    component.currentIndex = 0;
  
    component.scale = 1;
    component.translateX = 0;
    component.translateY = 0;
  
    const event = new MouseEvent('click');
  
    component.toggleZoom(event);

    expect(component.scale).toBe(1);         
    expect(component.translateX).toBe(0);    
    expect(component.translateY).toBe(0);    
  });
  
});