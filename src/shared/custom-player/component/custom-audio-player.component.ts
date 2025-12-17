import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-audio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-audio-player.component.html',
  styles: [`
    @keyframes scroll {
      0% { transform: translateX(0); }
      20% { transform: translateX(0); }
      80% { transform: translateX(calc(-100% + 176px)); }
      100% { transform: translateX(calc(-100% + 176px)); }
    }
    .animate-scroll { animation: scroll 8s linear infinite; }
  `]
})
export class CustomAudioPlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() src: string = '';
  @Input() fileName: string = '';
  @Input() type: string = '';
  @ViewChild('audioElement') audioElement!: ElementRef<HTMLAudioElement>;
  @ViewChild('fileNameElement') fileNameElement!: ElementRef<HTMLElement>;
  @ViewChild('volumeContainer') volumeContainer!: ElementRef<HTMLElement>;

  isPlaying = false;
  currentTime = 0;
  duration = 0;
  volume = 1;
  isMuted = false;
  isLoading = true;
  shouldScroll = false;
  showVolumeSlider = false;
  isVolumeSliderActive = false;
  Math = Math;

  private audio: HTMLAudioElement | null = null;
  public lastVolumeBeforeMute = 1;
  private volumeHideTimeout: any;
  private isDraggingVolume = false;
  private volumeBarRect: DOMRect | null = null;

  ngOnInit() { 
    setTimeout(() => this.initAudio()); 
  }

  ngAfterViewInit() { 
    setTimeout(() => this.checkFileNameScroll(), 100); 
  }

  ngOnDestroy() {
    if (this.volumeHideTimeout) {
      clearTimeout(this.volumeHideTimeout);
    }
    
    document.removeEventListener('mousemove', this.onDocumentMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onDocumentMouseUp.bind(this));
    
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
    }
  }

  private initAudio() {
    if (this.audioElement?.nativeElement) {
      this.audio = this.audioElement.nativeElement;
      this.audio.addEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));
      this.audio.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
      this.audio.addEventListener('ended', this.onEnded.bind(this));
      this.audio.addEventListener('canplay', this.onCanPlay.bind(this));
      this.audio.addEventListener('play', this.onPlay.bind(this));
      this.audio.addEventListener('pause', this.onPause.bind(this));
    }
  }

  private checkFileNameScroll() {
    if (this.fileNameElement?.nativeElement) {
      const el = this.fileNameElement.nativeElement;
      const container = el.parentElement;
      if (container) this.shouldScroll = el.scrollWidth > container.clientWidth;
    }
  }

  togglePlay() {
    if (!this.audio) return;
    this.isPlaying ? this.audio.pause() : this.audio.play().catch(console.error);
  }

  onTimeUpdate() { 
    if (this.audio) this.currentTime = this.audio.currentTime; 
  }

  onLoadedMetadata() { 
    if (this.audio) { 
      this.duration = this.audio.duration; 
      this.isLoading = false; 
    } 
    setTimeout(() => this.checkFileNameScroll(), 100); 
  }

  onCanPlay() { 
    this.isLoading = false; 
  }

  onEnded() { 
    this.isPlaying = false; 
    this.currentTime = 0; 
  }

  onPlay() { 
    this.isPlaying = true; 
  }

  onPause() { 
    this.isPlaying = false; 
  }

  onSeek(event: Event) {
    if (!this.audio) return;
    const value = Number((event.target as HTMLInputElement).value) / 100;
    this.audio.currentTime = value * this.duration;
  }

  onVolumeChange(event: Event) {
    if (!this.audio) return;
    this.volume = Number((event.target as HTMLInputElement).value) / 100;
    this.audio.volume = this.volume;
    this.isMuted = this.volume === 0;
    if (this.volume > 0) {
      this.lastVolumeBeforeMute = this.volume;
    }
    
    if (this.volumeHideTimeout) {
      clearTimeout(this.volumeHideTimeout);
    }
  }

  onVolumeBarClick(event: MouseEvent) {
    if (this.isLoading) return;
    this.setVolumeFromPosition(event);
  }

  onVolumeBarMouseDown(event: MouseEvent) {
    if (this.isLoading) return;
    event.preventDefault();
    this.isDraggingVolume = true;
    this.isVolumeSliderActive = true;
    this.volumeBarRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    
    this.setVolumeFromPosition(event);
    
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this));
    document.addEventListener('mouseup', this.onDocumentMouseUp.bind(this));
    
    if (this.volumeHideTimeout) {
      clearTimeout(this.volumeHideTimeout);
    }
  }

  private onDocumentMouseMove(event: MouseEvent) {
    if (!this.isDraggingVolume || !this.volumeBarRect) return;
    this.setVolumeFromPosition(event);
  }

  private onDocumentMouseUp() {
    if (this.isDraggingVolume) {
      this.isDraggingVolume = false;
      this.isVolumeSliderActive = false;
      this.volumeBarRect = null;
      
      document.removeEventListener('mousemove', this.onDocumentMouseMove.bind(this));
      document.removeEventListener('mouseup', this.onDocumentMouseUp.bind(this));
    }
  }

  private setVolumeFromPosition(event: MouseEvent) {
    if (!this.audio || !this.volumeBarRect) return;

    const y = event.clientY;
    const barTop = this.volumeBarRect.top;
    const barHeight = this.volumeBarRect.height;
    const barBottom = barTop + barHeight;
    
    let newVolume = (barBottom - y) / barHeight;
    newVolume = Math.max(0, Math.min(1, newVolume));
    
    this.volume = newVolume;
    this.audio.volume = this.volume;
    this.isMuted = this.volume === 0;
    
    if (this.volume > 0) {
      this.lastVolumeBeforeMute = this.volume;
    }
  }

  getCurrentVolume(): number {
    return this.isMuted ? 0 : this.volume;
  }

  onVolumeBlur() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  onVolumeContainerLeave(event: MouseEvent) {
    if (this.isDraggingVolume) return;
    
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('[data-volume-slider]')) {
      this.hideVolumeSliderWithDelay();
    }
  }

  onVolumeSliderLeave() {
    if (!this.isVolumeSliderActive && !this.isDraggingVolume) {
      this.hideVolumeSliderWithDelay();
    }
  }

  private hideVolumeSliderWithDelay() {
    this.volumeHideTimeout = setTimeout(() => {
      if (!this.isVolumeSliderActive && !this.isDraggingVolume) {
        this.showVolumeSlider = false;
      }
    }, 100);
  }

  toggleMute() {
    if (!this.audio) return;
    if (this.isMuted) { 
      this.volume = this.lastVolumeBeforeMute;
      this.audio.volume = this.volume; 
      this.isMuted = false; 
    } else { 
      this.lastVolumeBeforeMute = this.volume;
      this.audio.volume = 0; 
      this.isMuted = true; 
    }
  }

  formatTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  downloadFile() {
    const anchor = document.createElement('a');
    anchor.href = this.src;
    anchor.download = this.fileName || 'audio-file';
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}