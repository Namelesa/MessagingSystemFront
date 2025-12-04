import { SettingsService } from './setting.service';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');

    document.documentElement.classList.value = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('should create service and apply initial theme (light)', () => {
    spyOn<any>(SettingsService.prototype, 'applyTheme').and.callThrough();

    service = new SettingsService();

    expect(service).toBeTruthy();
    expect((service as any).applyTheme).toHaveBeenCalledWith('light');
  });

  it('should load saved settings from localStorage', () => {
    (localStorage.getItem as jasmine.Spy).and.returnValue(
      JSON.stringify({
        theme: 'dark',
        language: 'de',
        messageNotifications: false,
        soundNotifications: false
      })
    );

    service = new SettingsService();

    expect(service.settings.theme).toBe('dark');
    expect(service.settings.language).toBe('de');
    expect(service.settings.messageNotifications).toBeFalse();
    expect(service.settings.soundNotifications).toBeFalse();
  });

  it('should return current settings via getter', () => {
    service = new SettingsService();
    expect(service.settings.theme).toBe('light');
  });

  it('should update settings using set() and save to storage', () => {
    service = new SettingsService();
    spyOn<any>(service, 'applyTheme');

    service.set('language', 'ru');

    expect(service.settings.language).toBe('ru');
    expect(localStorage.setItem).toHaveBeenCalled();
    expect((service as any).applyTheme).not.toHaveBeenCalled();
  });

  it('should update theme and call applyTheme()', () => {
    service = new SettingsService();
    spyOn<any>(service, 'applyTheme').and.callThrough();

    service.set('theme', 'dark');

    expect(service.settings.theme).toBe('dark');
    expect((service as any).applyTheme).toHaveBeenCalledWith('dark');
  });

  it('should apply theme "dark" with class dark', () => {
    service = new SettingsService();

    (service as any).applyTheme('dark');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
  });

  it('should apply theme other than dark without adding dark class', () => {
    service = new SettingsService();

    (service as any).applyTheme('ocean');

    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });

  it('should remove dark class before applying new theme', () => {
    service = new SettingsService();

    document.documentElement.classList.add('dark');

    (service as any).applyTheme('sunset');

    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });

});
