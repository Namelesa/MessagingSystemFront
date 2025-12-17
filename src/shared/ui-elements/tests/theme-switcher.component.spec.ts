import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ThemeSwitcherComponent } from '../theme-switcher';
import { SettingsService } from '../../setting-key';

describe('ThemeSwitcherComponent', () => {
  let component: ThemeSwitcherComponent;
  let fixture: ComponentFixture<ThemeSwitcherComponent>;

  let settingsSubject: BehaviorSubject<any>;
  let settingsServiceMock: any;

  beforeEach(async () => {
    settingsSubject = new BehaviorSubject({ theme: 'light' });

    settingsServiceMock = {
      settings$: settingsSubject.asObservable(),
      set: jasmine.createSpy('set')
    };

    await TestBed.configureTestingModule({
      imports: [ThemeSwitcherComponent],
      providers: [
        { provide: SettingsService, useValue: settingsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should set isDark = false when theme is light', () => {
    expect(component.isDark).toBeFalse();
  });

  it('should set isDark = true when theme becomes dark', () => {
    settingsSubject.next({ theme: 'dark' });
    expect(component.isDark).toBeTrue();
  });

  it('toggleTheme() should switch light → dark', () => {
    component.isDark = false;

    component.toggleTheme();

    expect(settingsServiceMock.set).toHaveBeenCalledWith('theme', 'dark');
  });

  it('toggleTheme() should switch dark → light', () => {
    component.isDark = true;

    component.toggleTheme();

    expect(settingsServiceMock.set).toHaveBeenCalledWith('theme', 'light');
  });
});
