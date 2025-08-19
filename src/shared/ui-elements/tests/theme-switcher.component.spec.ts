import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeSwitcherComponent } from '../theme-switcher';

describe('ThemeSwitcherComponent', () => {
  let component: ThemeSwitcherComponent;
  let fixture: ComponentFixture<ThemeSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeSwitcherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should read dark theme from localStorage on init', () => {
    localStorage.setItem('theme', 'dark');
    component.ngOnInit();
    expect(component.isDark).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
  });

  it('should read light theme from localStorage on init', () => {
    localStorage.setItem('theme', 'light');
    component.ngOnInit();
    expect(component.isDark).toBeFalse();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });

  it('should toggle theme correctly', () => {
    component.isDark = false;
    component.toggleTheme();
    expect(component.isDark).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(localStorage.getItem('theme')).toBe('dark');

    component.toggleTheme();
    expect(component.isDark).toBeFalse();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
