import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [NgIf],
  templateUrl: './theme-switcher.component.html',
})
export class ThemeSwitcherComponent implements OnInit {
  isDark = false;

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('theme');
    this.isDark = savedTheme === 'dark';
    document.documentElement.classList.toggle('dark', this.isDark);
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    document.documentElement.classList.toggle('dark', this.isDark);
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
  }
}
