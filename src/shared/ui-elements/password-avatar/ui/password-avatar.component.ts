import { NgIf } from '@angular/common';
import { Component, Input, HostListener, OnInit, OnDestroy } from '@angular/core';


@Component({
    selector: 'app-password-avatar',
    standalone: true,
    imports: [NgIf],
    templateUrl: './password-avatar.component.html',
    styleUrls: ['./password-avatar.component.scss'],
})
export class PasswordAvatarComponent implements OnInit, OnDestroy {
    @Input() isPasswordVisible = false;
    @Input() passwordLength = 0;

    eyeOffsetX = 0;
    eyeOffsetY = 0;
    isBlinking = false;

    private blinkIntervalId?: ReturnType<typeof setTimeout>;

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const maxOffset = 4;
        this.eyeOffsetX = ((event.clientX - centerX) / centerX) * maxOffset;
        this.eyeOffsetY = ((event.clientY - centerY) / centerY) * maxOffset;
    }

    ngOnInit() {
        this.scheduleBlink();
    }

    ngOnDestroy() {
        if (this.blinkIntervalId) {
            clearTimeout(this.blinkIntervalId);
        }
    }

    private scheduleBlink() {
        const delay = 5000 + Math.random() * 2000;

        this.blinkIntervalId = setTimeout(() => {
            this.isBlinking = true;

            setTimeout(() => {
                this.isBlinking = false;
                this.scheduleBlink();
            }, 150);
        }, delay);
    }

    getSmilePath(): string {
        const length = Math.min(this.passwordLength, 20);
        const smileHeight = 10 + length * 0.3; 

        return `M 30 52 Q 40 ${smileHeight + 52} 50 52`;
    }
}
