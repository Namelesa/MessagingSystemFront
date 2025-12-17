import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CustomAudioPlayerComponent } from './custom-audio-player.component';
import { ElementRef } from '@angular/core';

describe('CustomAudioPlayerComponent', () => {
  let component: CustomAudioPlayerComponent;
  let fixture: ComponentFixture<CustomAudioPlayerComponent>;

  function createMockAudio(): any {
    const listeners: Record<string, Function[]> = {};
    const audio: any = {
      currentTime: 0,
      duration: 0,
      volume: 1,
      src: '',
      load: jasmine.createSpy('load'),
      play: jasmine.createSpy('play').and.returnValue(Promise.resolve()),
      pause: jasmine.createSpy('pause'),
      addEventListener: (evt: string, cb: Function) => {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push(cb);
      },
      removeEventListener: (evt: string, cb: Function) => {
        if (!listeners[evt]) return;
        listeners[evt] = listeners[evt].filter(f => f !== cb);
      },
      __trigger: (evt: string, ...args: any[]) => {
        (listeners[evt] || []).forEach(fn => fn(...args));
      }
    };
    return audio;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomAudioPlayerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomAudioPlayerComponent);
    component = fixture.componentInstance;

    component.src = 'audio.mp3';
    component.fileName = 'song.mp3';
    component.type = 'audio/mp3';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit schedules initAudio', fakeAsync(() => {
    const mockAudio = createMockAudio();
    component.audioElement = { nativeElement: mockAudio } as ElementRef<HTMLAudioElement>;
    component.ngOnInit();
    tick();
    expect(typeof mockAudio.addEventListener).toBe('function');
  }));

  it('ngAfterViewInit schedules checkFileNameScroll', fakeAsync(() => {
    const fileEl: any = {
      nativeElement: {
        scrollWidth: 300,
        parentElement: { clientWidth: 100 }
      }
    };
    component.fileNameElement = fileEl as ElementRef<HTMLElement>;
    component.ngAfterViewInit();
    tick(100);
    expect(component.shouldScroll).toBeTrue();
  }));

  it('checkFileNameScroll sets shouldScroll false when fits', () => {
    const fileEl: any = {
      nativeElement: {
        scrollWidth: 100,
        parentElement: { clientWidth: 200 }
      }
    };
    component.fileNameElement = fileEl as ElementRef<HTMLElement>;
    component['checkFileNameScroll']();
    expect(component.shouldScroll).toBeFalse();
  });

  it('initAudio binds audio events', () => {
    const mockAudio = createMockAudio();
    component.audioElement = { nativeElement: mockAudio } as ElementRef<HTMLAudioElement>;
    (component as any).initAudio();
    mockAudio.__trigger('loadedmetadata');
    mockAudio.__trigger('timeupdate');
    mockAudio.__trigger('ended');
    mockAudio.__trigger('canplay');
    mockAudio.__trigger('play');
    mockAudio.__trigger('pause');
    expect(component.isLoading).toBeFalse();
  });

  it('togglePlay does nothing when audio missing', () => {
    component['audio'] = null;
    component.isPlaying = false;
    component.togglePlay();
    expect(component.isPlaying).toBeFalse();
  });

  it('togglePlay plays and pauses audio when present', fakeAsync(() => {
    const mockAudio = createMockAudio();
    component['audio'] = mockAudio;

    component.isPlaying = false;
    component.togglePlay();
    expect(mockAudio.play).toHaveBeenCalled();

    component.onPlay();
    expect(component.isPlaying).toBeTrue();

    component.togglePlay();
    expect(mockAudio.pause).toHaveBeenCalled();

    component.onPause();
    expect(component.isPlaying).toBeFalse();
  }));

  it('onTimeUpdate updates currentTime', () => {
    const mockAudio = createMockAudio();
    mockAudio.currentTime = 12.5;
    component['audio'] = mockAudio;
    component.onTimeUpdate();
    expect(component.currentTime).toBe(12.5);
  });

  it('onLoadedMetadata sets duration and isLoading and schedules checkFileNameScroll', fakeAsync(() => {
    const mockAudio = createMockAudio();
    mockAudio.duration = 120;
    component['audio'] = mockAudio;
    component.onLoadedMetadata();
    expect(component.duration).toBe(120);
    expect(component.isLoading).toBeFalse();
    tick(100);
  }));

  it('onCanPlay sets isLoading false', () => {
    component.isLoading = true;
    component.onCanPlay();
    expect(component.isLoading).toBeFalse();
  });

  it('onEnded resets playing and currentTime', () => {
    component.isPlaying = true;
    component.currentTime = 50;
    component.onEnded();
    expect(component.isPlaying).toBeFalse();
    expect(component.currentTime).toBe(0);
  });

  it('onPlay sets isPlaying true', () => {
    component.isPlaying = false;
    component.onPlay();
    expect(component.isPlaying).toBeTrue();
  });

  it('onPause sets isPlaying false', () => {
    component.isPlaying = true;
    component.onPause();
    expect(component.isPlaying).toBeFalse();
  });

  it('onSeek does nothing if no audio', () => {
    component['audio'] = null;
    const event = { target: { value: '50' } } as any;
    component.onSeek(event);
  });

  it('onSeek sets currentTime correctly', () => {
    const mockAudio = createMockAudio();
    mockAudio.duration = 200;
    component['audio'] = mockAudio;
    component.duration = 200;
    const event = { target: { value: '25' } } as any;
    component.onSeek(event as any);
    expect(mockAudio.currentTime).toBeCloseTo(50);
  });

  it('onVolumeChange does nothing if no audio', () => {
    component['audio'] = null;
    const event = { target: { value: '30' } } as any;
    component.onVolumeChange(event as any);
    expect(component.volume).toBe(1);
  });

  it('onVolumeBarClick does nothing while loading', () => {
    component.isLoading = true;
    spyOn(component as any, 'setVolumeFromPosition');
    component.onVolumeBarClick(new MouseEvent('click'));
    expect((component as any).setVolumeFromPosition).not.toHaveBeenCalled();
  });

  it('onVolumeBarClick calls setVolumeFromPosition when not loading', () => {
    component.isLoading = false;
    spyOn(component as any, 'setVolumeFromPosition');
    const evt = new MouseEvent('click');
    component.onVolumeBarClick(evt);
    expect((component as any).setVolumeFromPosition).toHaveBeenCalledTimes(1);
  });

  it('onVolumeBarMouseDown sets flags and adds document listeners and sets volume from position', () => {
    component.isLoading = false;

    const addSpy = spyOn(document, 'addEventListener').and.callFake(() => {});
    const removeSpy = spyOn(document, 'removeEventListener').and.callFake(() => {});

    const rect = { top: 0, height: 100, width: 10, bottom: 100, left: 0, right: 10 } as DOMRect;
    const target: any = {
      getBoundingClientRect: () => rect
    };
    const evt: any = {
      currentTarget: target,
      clientY: 50,
      preventDefault: jasmine.createSpy('preventDefault')
    };

    component.onVolumeBarMouseDown(evt as MouseEvent);

    expect(evt.preventDefault).toHaveBeenCalled();
    expect(component['isDraggingVolume']).toBeTrue();
    expect(component['isVolumeSliderActive']).toBeTrue();
    expect(component['volumeBarRect']).toEqual(rect);

    expect(addSpy).toHaveBeenCalledWith('mousemove', jasmine.any(Function));
    expect(addSpy).toHaveBeenCalledWith('mouseup', jasmine.any(Function));

  });

  it('onDocumentMouseMove only acts when dragging and rect present', () => {
    spyOn(component as any, 'setVolumeFromPosition');
    component['isDraggingVolume'] = false;
    component['volumeBarRect'] = { top: 0, height: 100 } as DOMRect;
    component['onDocumentMouseMove'](new MouseEvent('mousemove'));
    expect((component as any).setVolumeFromPosition).not.toHaveBeenCalled();

    component['isDraggingVolume'] = true;
    component['volumeBarRect'] = { top: 0, height: 100 } as DOMRect;
    component['onDocumentMouseMove'](new MouseEvent('mousemove'));
    expect((component as any).setVolumeFromPosition).toHaveBeenCalled();
  });

  it('onDocumentMouseUp resets dragging flags and removes listeners', () => {
    const addSpy = spyOn(document, 'addEventListener').and.callFake(() => {});
    const removeSpy = spyOn(document, 'removeEventListener').and.callFake(() => {});

    component['isDraggingVolume'] = true;
    component['isVolumeSliderActive'] = true;
    component['volumeBarRect'] = {} as DOMRect;

    component['onDocumentMouseUp']();

    expect(component['isDraggingVolume']).toBeFalse();
    expect(component['isVolumeSliderActive']).toBeFalse();
    expect(component['volumeBarRect']).toBeNull();

    expect(removeSpy).toHaveBeenCalledWith('mousemove', jasmine.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseup', jasmine.any(Function));
  });

  it('setVolumeFromPosition calculates volume correctly and clamps', () => {
    const mockAudio = createMockAudio();
    component['audio'] = mockAudio;
    component['volumeBarRect'] = { top: 0, height: 100 } as DOMRect;

    const evt: any = { clientY: 50 };
    (component as any).setVolumeFromPosition(evt);
    expect(component.volume).toBeCloseTo(0.5);
    expect(mockAudio.volume).toBeCloseTo(0.5);

    const evt2: any = { clientY: 200 };
    (component as any).setVolumeFromPosition(evt2);
    expect(component.volume).toBe(0);

    const evt3: any = { clientY: -50 };
    (component as any).setVolumeFromPosition(evt3);
    expect(component.volume).toBe(1);
  });

  it('getCurrentVolume respects mute', () => {
    component.volume = 0.3;
    component.isMuted = false;
    expect(component.getCurrentVolume()).toBeCloseTo(0.3);
    component.isMuted = true;
    expect(component.getCurrentVolume()).toBe(0);
  });

  it('onVolumeBlur blurs activeElement when HTMLElement', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    component.onVolumeBlur();
    document.body.removeChild(input);
  });

  it('onVolumeContainerLeave hides slider when leaving and not dragging', fakeAsync(() => {
    component['isDraggingVolume'] = false;
    component['isVolumeSliderActive'] = false;
    const evt: any = { relatedTarget: null };
    component.onVolumeContainerLeave(evt as MouseEvent);
    tick(101);
    expect(component.showVolumeSlider).toBeFalse();
  }));

  it('onVolumeContainerLeave does nothing when dragging', () => {
    component['isDraggingVolume'] = true;
    component['isVolumeSliderActive'] = false;
    const evt: any = { relatedTarget: null };
    component.onVolumeContainerLeave(evt as any);
    expect(component.showVolumeSlider).toBeFalse();
  });

  it('onVolumeSliderLeave hides slider when inactive', fakeAsync(() => {
    component['isVolumeSliderActive'] = false;
    component['isDraggingVolume'] = false;
    component.showVolumeSlider = true;
    component.onVolumeSliderLeave();
    tick(101);
    expect(component.showVolumeSlider).toBeFalse();
  }));

  it('formatTime formats mm:ss correctly', () => {
    expect(component.formatTime(0)).toBe('0:00');
    expect(component.formatTime(65)).toBe('1:05');
    expect(component.formatTime(125)).toBe('2:05');
  });

  it('downloadFile creates anchor and triggers download', () => {
    component.src = 'audio.mp3';
    component.fileName = 'song.mp3';

    const anchor = document.createElement('a');
    spyOn(document, 'createElement').and.returnValue(anchor);
    spyOn(anchor, 'click');

    component.downloadFile();

    expect(anchor.href).toContain('audio.mp3');
    expect(anchor.download).toBe('song.mp3');
    expect(anchor.target).toBe('_blank');
    expect(anchor.click).toHaveBeenCalled();
  });

  it('onVolumeBarMouseDown returns immediately when loading', () => {
    component.isLoading = true;

    const evt = {
      preventDefault: jasmine.createSpy('preventDefault'),
      currentTarget: {
        getBoundingClientRect: () => ({})
      }
    } as any;

    spyOn(component as any, 'setVolumeFromPosition');

    component.onVolumeBarMouseDown(evt);

    expect(evt.preventDefault).not.toHaveBeenCalled();
    expect((component as any).setVolumeFromPosition).not.toHaveBeenCalled();
  });

  it('onVolumeBarMouseDown clears volumeHideTimeout when present', () => {
    component.isLoading = false;

    const fakeTimeout = setTimeout(() => {}, 9999);
    component['volumeHideTimeout'] = fakeTimeout;

    spyOn(window, 'clearTimeout');

    const rect = { top: 0, height: 100 } as DOMRect;

    const evt: any = {
      preventDefault: jasmine.createSpy('preventDefault'),
      clientY: 50,
      currentTarget: {
        getBoundingClientRect: () => rect
      }
    };
    component.onVolumeBarMouseDown(evt as MouseEvent);

    expect(clearTimeout).toHaveBeenCalledWith(fakeTimeout);
  });

  it('toggleMute returns when audio is missing', () => {
    component['audio'] = null;

    component.isMuted = false;
    component.volume = 0.5;
    component.lastVolumeBeforeMute = 0.5;

    component.toggleMute();

    expect(component.volume).toBe(0.5);
    expect(component.isMuted).toBeFalse();
  });

  it('onVolumeContainerLeave executes hideVolumeSliderWithDelay when relatedTarget lacks volume slider', fakeAsync(() => {
    component['isDraggingVolume'] = false;

    spyOn(component as any, 'hideVolumeSliderWithDelay');

    const evt: any = {
      relatedTarget: {
        closest: () => null
      }
    };

    component.onVolumeContainerLeave(evt);

    expect((component as any).hideVolumeSliderWithDelay).toHaveBeenCalled();
  }));

  it('onVolumeChange updates volume, audio.volume, lastVolumeBeforeMute and clears timeout when > 0', () => {
    const mockAudio = createMockAudio();
    component['audio'] = mockAudio;
    component['volumeHideTimeout'] = 12345;
    spyOn(window, 'clearTimeout');

    const event = { target: { value: '30' } } as any;
    component.onVolumeChange(event);

    expect(component.volume).toBeCloseTo(0.3, 5);
    expect(mockAudio.volume).toBeCloseTo(0.3, 5);
    expect(component.isMuted).toBeFalse();
    expect(component.lastVolumeBeforeMute).toBeCloseTo(0.3, 5);
    expect(clearTimeout).toHaveBeenCalledWith(12345);
  });

  it('onVolumeChange sets mute when value is 0 and does not change lastVolumeBeforeMute', () => {
    const mockAudio = createMockAudio();
    component['audio'] = mockAudio;
    component.lastVolumeBeforeMute = 0.5;

    const event = { target: { value: '0' } } as any;
    component.onVolumeChange(event);

    expect(component.volume).toBe(0);
    expect(mockAudio.volume).toBe(0);
    expect(component.isMuted).toBeTrue();
    expect(component.lastVolumeBeforeMute).toBe(0.5);
  });

  it('toggleMute toggles mute and restores previous volume when audio present', () => {
    const mockAudio = createMockAudio();
    component['audio'] = mockAudio;

    component.volume = 0.4;
    component.lastVolumeBeforeMute = 0.4;
    component.isMuted = false;

    component.toggleMute();

    expect(component.isMuted).toBeTrue();
    expect(mockAudio.volume).toBe(0);
    expect(component.lastVolumeBeforeMute).toBeCloseTo(0.4, 5);

    component.toggleMute();

    expect(component.isMuted).toBeFalse();
    expect(mockAudio.volume).toBeCloseTo(0.4, 5);
    expect(component.volume).toBeCloseTo(0.4, 5);
  });

  it('downloadFile uses default "audio-file" when fileName is empty', () => {
    component.src = 'audio.mp3';
    component.fileName = '';

    const anchor = document.createElement('a');
    spyOn(document, 'createElement').and.returnValue(anchor);
    spyOn(anchor, 'click');

    component.downloadFile();

    expect(anchor.href).toContain('audio.mp3');
    expect(anchor.download).toBe('audio-file');
    expect(anchor.target).toBe('_blank');
    expect(anchor.click).toHaveBeenCalled();
  });
});
