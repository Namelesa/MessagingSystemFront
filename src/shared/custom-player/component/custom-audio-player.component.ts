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

  isPlaying = false;
  currentTime = 0;
  duration = 0;
  volume = 1;
  isMuted = false;
  isLoading = true;
  shouldScroll = false;
  Math = Math;

  private audio: HTMLAudioElement | null = null;
  private lastVolumeBeforeMute = 1;

  ngOnInit() { setTimeout(() => this.initAudio()); }
  ngAfterViewInit() { setTimeout(() => this.checkFileNameScroll(), 100); }

  ngOnDestroy() {
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

  onTimeUpdate() { if (this.audio) this.currentTime = this.audio.currentTime; }
  onLoadedMetadata() { if (this.audio) { this.duration = this.audio.duration; this.isLoading = false; } setTimeout(() => this.checkFileNameScroll(), 100); }
  onCanPlay() { this.isLoading = false; }
  onEnded() { this.isPlaying = false; this.currentTime = 0; }

  onSeek(event: Event) {
    if (!this.audio) return;
    const v = Number((event.target as HTMLInputElement).value) / 100;
    this.audio.currentTime = v * this.duration;
  }

  onVolumeChange(event: Event) {
    if (!this.audio) return;
    this.volume = Number((event.target as HTMLInputElement).value) / 100;
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
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  downloadFile() {
    const a = document.createElement('a');
    a.href = this.src;
    a.download = this.fileName || 'audio-file';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  onPlay() { this.isPlaying = true; }
  onPause() { this.isPlaying = false; }
}