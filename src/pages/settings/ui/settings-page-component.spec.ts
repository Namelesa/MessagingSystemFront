import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SettingsPageComponent } from './settings-page-component';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { SettingsService, Theme } from '../../../shared/setting-key';
import { NotificationService } from '../../../shared/notification';
import { BehaviorSubject, of, Subject } from 'rxjs';

describe('SettingsPageComponent', () => {
  let component: SettingsPageComponent;
  let fixture: ComponentFixture<SettingsPageComponent>;
  let translateService: jasmine.SpyObj<TranslateService>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let settingsSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    settingsSubject = new BehaviorSubject({
      messageNotifications: true,
      soundNotifications: true,
      theme: 'light',
      language: 'en'
    });

    translateService = jasmine.createSpyObj('TranslateService', ['use', 'get', 'stream'], {
      onLangChange: new Subject(),
      onTranslationChange: new Subject(),
      onDefaultLangChange: new Subject(),
      currentLang: 'en',
      defaultLang: 'en'
    });
    translateService.use.and.returnValue(of({}));
    translateService.get.and.returnValue(of({}));
    translateService.stream.and.returnValue(of({}));

    settingsService = jasmine.createSpyObj('SettingsService', ['set', 'get'], {
      settings$: settingsSubject.asObservable()
    });

    notificationService = jasmine.createSpyObj('NotificationService', [
      'getPermission',
      'requestPermission',
      'showNotification'
    ]);
    notificationService.getPermission.and.returnValue('default');
    notificationService.requestPermission.and.returnValue(Promise.resolve('granted'));

    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: TranslateService, useValue: translateService },
        { provide: SettingsService, useValue: settingsService },
        { provide: NotificationService, useValue: notificationService }
      ]
    }).compileComponents();

    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');

    fixture = TestBed.createComponent(SettingsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('ngOnInit', () => {
    it('should call checkNotificationSupport and syncNotificationPermission', () => {
      const checkSpy = spyOn(component, 'checkNotificationSupport');
      const syncSpy = spyOn(component, 'syncNotificationPermission');
  
      component.ngOnInit();
  
      expect(checkSpy).toHaveBeenCalled();
      expect(syncSpy).toHaveBeenCalled();
    });
  });  

  describe('toggle()', () => {

    beforeEach(() => {
      spyOn(window, 'alert'); 
    });

    it('should enable message notifications when permission is granted', fakeAsync(() => {
      notificationService.requestPermission.and.returnValue(Promise.resolve('granted'));
      notificationService.getPermission.and.returnValue('granted'); 
    
      component.toggle('messageNotifications', true);
      tick();
    
      expect(settingsService.set).toHaveBeenCalledWith('messageNotifications', true);
      expect(component.settings.messageNotifications).toBeTrue();
      expect(component.notificationStatus).toBe('Notifications enabled ✓');
    }));    
  
    it('should disable message notifications when permission is denied', fakeAsync(() => {
      notificationService.requestPermission.and.returnValue(Promise.resolve('denied'));
  
      component.toggle('messageNotifications', true);
      tick();
  
      expect(settingsService.set).toHaveBeenCalledWith('messageNotifications', true);
      expect(component.settings.messageNotifications).toBeFalse();
      expect(window.alert).toHaveBeenCalledWith('Please enable notifications in your browser settings.');
    }));
    
    it('should show alert when disabling message notifications', () => {
      component.toggle('messageNotifications', false);
  
      expect(settingsService.set).toHaveBeenCalledWith('messageNotifications', false);
      expect(window.alert).toHaveBeenCalledWith(
        'To fully disable notifications, please block them in browser settings.'
      );
    });

    it('should update sound notifications', () => {
      component.toggle('soundNotifications', false);
  
      expect(settingsService.set).toHaveBeenCalledWith('soundNotifications', false);
      expect(component.settings.soundNotifications).toBeFalse();
    });
  });

  describe('Notification support and permissions', () => {
    it('should detect when notifications are supported', () => {
      notificationService.getPermission.and.returnValue('default');
      
      component.checkNotificationSupport();

      expect(component.notificationSupported).toBeTrue();
    });

    it('should detect when notifications are not supported', () => {
      notificationService.getPermission.and.returnValue('unsupported');
      
      component.checkNotificationSupport();

      expect(component.notificationSupported).toBeFalse();
      expect(component.notificationStatus).toBe('Notifications not supported in this browser');
    });

    it('should update status for granted permission', () => {
      notificationService.getPermission.and.returnValue('granted');
      
      component.updateNotificationStatus();

      expect(component.notificationStatus).toBe('Notifications enabled ✓');
    });

    it('should update status for denied permission', () => {
      notificationService.getPermission.and.returnValue('denied');
      
      component.updateNotificationStatus();

      expect(component.notificationStatus).toBe('Notifications blocked - check browser settings');
    });

    it('should update status for default permission', () => {
      notificationService.getPermission.and.returnValue('default');
      
      component.updateNotificationStatus();

      expect(component.notificationStatus).toBe('Click to enable notifications');
    });

    it('should sync notification permission to false when denied', () => {
      notificationService.getPermission.and.returnValue('denied');
      
      component.syncNotificationPermission();

      expect(component.settings.messageNotifications).toBeFalse();
    });

    it('should sync notification permission to true when granted', () => {
      notificationService.getPermission.and.returnValue('granted');
      
      component.syncNotificationPermission();

      expect(component.settings.messageNotifications).toBeTrue();
    });
  });

  describe('Theme selection', () => {
    it('should select light theme', () => {
      component.selectTheme('light');

      expect(settingsService.set).toHaveBeenCalledWith('theme', 'light');
    });

    it('should select dark theme', () => {
      component.selectTheme('dark');

      expect(settingsService.set).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should select ocean theme', () => {
      component.selectTheme('ocean');

      expect(settingsService.set).toHaveBeenCalledWith('theme', 'ocean');
    });

    it('should have all theme options defined', () => {
      expect(component.themeOptions.length).toBe(8);
      expect(component.themeOptions.map(t => t.value)).toContain('light');
      expect(component.themeOptions.map(t => t.value)).toContain('dark');
      expect(component.themeOptions.map(t => t.value)).toContain('ocean');
      expect(component.themeOptions.map(t => t.value)).toContain('forest');
      expect(component.themeOptions.map(t => t.value)).toContain('sunset');
      expect(component.themeOptions.map(t => t.value)).toContain('purple');
      expect(component.themeOptions.map(t => t.value)).toContain('rose');
      expect(component.themeOptions.map(t => t.value)).toContain('amber');
    });
  });

  describe('Mouse hover effects', () => {
    it('should handle null target on mouse enter', () => {
      const event = { target: null } as any;
      
      expect(() => component.onMouseEnter(event)).not.toThrow();
    });

    it('should handle null target on mouse leave', () => {
      const event = { target: null } as any;
      
      expect(() => component.onMouseLeave(event)).not.toThrow();
    });
  });

  describe('Settings persistence', () => {
    it('should handle missing localStorage gracefully', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      
      const newComponent = new SettingsPageComponent(
        translateService,
        settingsService,
        notificationService
      );
      
      expect(newComponent.settings.language).toBe('en');
    });

    it('should handle invalid JSON in localStorage', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('invalid json');
      
      expect(() => {
        new SettingsPageComponent(
          translateService,
          settingsService,
          notificationService
        );
      }).toThrow();
    });

    it('should merge saved settings with defaults', () => {
      const partial = JSON.stringify({ language: 'uk' });
      (localStorage.getItem as jasmine.Spy).and.returnValue(partial);

      settingsSubject.next({
        messageNotifications: true,
        soundNotifications: true,
        theme: 'light',
        language: 'uk'
      });
      
      const newComponent = new SettingsPageComponent(
        translateService,
        settingsService,
        notificationService
      );
      
      expect(newComponent.settings.language).toBe('uk');
      expect(newComponent.settings.messageNotifications).toBeTrue();
      expect(newComponent.settings.soundNotifications).toBeTrue();
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined notification permission', () => {
      notificationService.getPermission.and.returnValue(undefined as any);
      
      component.updateNotificationStatus();
      
      expect(component.notificationStatus).toBe('Notifications not available');
    });

    it('should handle theme change to all available themes', () => {
      const themes: Theme[] = ['light', 'dark', 'ocean', 'forest', 'sunset', 'purple', 'rose', 'amber'];
      
      themes.forEach(theme => {
        component.selectTheme(theme);
        expect(settingsService.set).toHaveBeenCalledWith('theme', theme);
      });
    });

    it('should handle rapid theme changes', () => {
      component.selectTheme('light');
      component.selectTheme('dark');
      component.selectTheme('ocean');
      
      expect(settingsService.set).toHaveBeenCalledTimes(3);
    });
    
    it('should handle rapid language changes', () => {
      translateService.use.calls.reset();
      
      component.selectLanguage('en');
      component.selectLanguage('uk');
      component.selectLanguage('de');
      
      expect(translateService.use).toHaveBeenCalledTimes(3);
    });
  });

  describe('Language dropdown', () => {
    it('should toggle language dropdown open and closed', () => {
      component.languageDropdownOpen = false;
  
      component.toggleLanguageDropdown();
      expect(component.languageDropdownOpen).toBeTrue();
  
      component.toggleLanguageDropdown();
      expect(component.languageDropdownOpen).toBeFalse();
    });

    it('should return selected language option', () => {
      component.settings.language = 'de';
    
      const selected = component.getSelectedLanguage();
    
      expect(selected.value).toBe('de');
    });
    
    it('should fallback to first language option if not found', () => {
      component.settings.language = 'unknown';
    
      const selected = component.getSelectedLanguage();
    
      expect(selected.value).toBe('en');
    });

    it('should set background color on mouse enter', () => {
      const element = document.createElement('div');
      const event = { target: element } as any;
    
      component.onMouseEnter(event);
    
      expect(element.style.backgroundColor).toBe('var(--bg-tertiary)');
    });

    it('should clear background color on mouse leave', () => {
      const element = document.createElement('div');
      const event = { target: element } as any;
    
      component.onMouseLeave(event);
    
      expect(element.style.backgroundColor).toBe('transparent');
    });

    it('should close language dropdown when clicking outside', () => {
      component.languageDropdownOpen = true;
    
      const event = {
        target: document.createElement('div')
      } as any;
    
      spyOn(event.target, 'closest').and.returnValue(null);
    
      component.onDocumentClick(event);
    
      expect(component.languageDropdownOpen).toBeFalse();
    });

    it('should not close dropdown when clicking inside dropdown', () => {
      component.languageDropdownOpen = true;
    
      const element = document.createElement('div');
      spyOn(element, 'closest').and.returnValue(document.createElement('div'));
    
      const event = { target: element } as any;
    
      component.onDocumentClick(event);
    
      expect(component.languageDropdownOpen).toBeTrue();
    });
  });  

  describe('enableNotifications()', () => {
    it('should enable notifications when granted', fakeAsync(() => {
      notificationService.requestPermission.and.returnValue(Promise.resolve('granted'));
      notificationService.getPermission.and.returnValue('granted');
      spyOn(component, 'updateNotificationStatus');
  
      component.enableNotifications();
      tick();
  
      expect(settingsService.set).toHaveBeenCalledWith('messageNotifications', true);
      expect(component.settings.messageNotifications).toBeTrue();
      expect(component.updateNotificationStatus).toHaveBeenCalled();
    }));

    it('should only update notification status when denied', fakeAsync(() => {
      notificationService.requestPermission.and.returnValue(Promise.resolve('denied'));
      spyOn(component, 'updateNotificationStatus');
  
      component.enableNotifications();
      tick();
  
      expect(settingsService.set).not.toHaveBeenCalledWith('messageNotifications', true);
      expect(component.updateNotificationStatus).toHaveBeenCalled();
    }));
      
  });

  describe('testNotification()', () => {
    it('should exit early when notifications not supported', fakeAsync(() => {
      component.notificationSupported = false;
  
      const showSpy = notificationService.showNotification;
  
      component.testNotification();
      tick();
  
      expect(showSpy).not.toHaveBeenCalled();
    }));

    it('should catch error when showNotification throws', fakeAsync(() => {
      component.notificationSupported = true;
    
      notificationService.getPermission.and.returnValue('granted');
      notificationService.showNotification.and.callFake(() => {
        throw new Error('Simulated error');
      });
    
      const consoleSpy = spyOn(console, 'error');

      component.testNotification();
      tick();
    
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.calls.argsFor(0)[0]).toContain('❌ Error showing notification:');
    }));    
  });  

  it('should request permission and exit if denied', fakeAsync(() => {
    component.notificationSupported = true;

    notificationService.getPermission.and.returnValue('default');
    notificationService.requestPermission.and.returnValue(Promise.resolve('denied'));
    spyOn(component, 'updateNotificationStatus');

    component.testNotification();
    tick();

    expect(component.updateNotificationStatus).toHaveBeenCalled();
    expect(notificationService.showNotification).not.toHaveBeenCalled();
  }));

  it('should show notification when permission granted', fakeAsync(() => {
    component.notificationSupported = true;

    notificationService.getPermission.and.returnValue('default');
    notificationService.requestPermission.and.returnValue(Promise.resolve('granted'));

    spyOn(component, 'updateNotificationStatus');

    component.testNotification();
    tick();

    expect(notificationService.showNotification).toHaveBeenCalled();
    expect(component.updateNotificationStatus).toHaveBeenCalled();
  }));  
});