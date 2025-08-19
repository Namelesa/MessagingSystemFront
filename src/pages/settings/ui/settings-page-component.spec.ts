import { SettingsPageComponent } from './settings-page-component';

describe('SettingsPageComponent', () => {
  let component: SettingsPageComponent;
  let storeSpy: jasmine.Spy;

  beforeEach(() => {
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');

    component = new SettingsPageComponent();
  });

  it('should create component and initialize default settings', () => {
    expect(component).toBeTruthy();
    expect(component.settings.messageNotifications).toBeTrue();
    expect(component.settings.soundNotifications).toBeTrue();
    expect(component.settings.theme).toBeFalse();
  });

  it('should load saved settings from localStorage', () => {
    const savedSettings = {
      messageNotifications: false,
      soundNotifications: false,
      theme: true,
    };
    (localStorage.getItem as jasmine.Spy).and.returnValue(JSON.stringify(savedSettings));

    component = new SettingsPageComponent();

    expect(component.settings.messageNotifications).toBeFalse();
    expect(component.settings.soundNotifications).toBeFalse();
    expect(component.settings.theme).toBeTrue();
  });

  it('should toggle a setting and save it to localStorage', () => {
    component.toggle('messageNotifications', false);
    expect(component.settings.messageNotifications).toBeFalse();
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'settings',
      JSON.stringify(component.settings)
    );

    component.toggle('theme', true);
    expect(component.settings.theme).toBeTrue();
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'settings',
      JSON.stringify(component.settings)
    );
  });

  it('notificationSettings and appearanceSettings should be defined correctly', () => {
    expect(component.notificationSettings.length).toBe(2);
    expect(component.appearanceSettings.length).toBe(1);

    expect(component.notificationSettings[0].key).toBe('messageNotifications');
    expect(component.appearanceSettings[0].key).toBe('theme');
  });
});
