import { Component } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [NgIf],
  templateUrl: './theme-switcher.component.html',
})
export class ThemeSwitcherComponent {
  isDark = false;

  toggleTheme() {
    this.isDark = !this.isDark;
    document.documentElement.classList.toggle('dark', this.isDark);
  }
}
