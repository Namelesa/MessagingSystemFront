import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TranslateService } from '@ngx-translate/core';

describe('App Component (constructor logic)', () => {
  let translateSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    translateSpy = jasmine.createSpyObj('TranslateService', [
      'addLangs',
      'setFallbackLang',
      'use',
      'getBrowserLang'
    ]);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: TranslateService, useValue: translateSpy }]
    }).compileComponents();

    translateSpy.getBrowserLang.and.returnValue('de');
  });

  function create() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('should create the app', () => {
    const app = create();
    expect(app).toBeTruthy();
  });

  it('should load language from saved settings when language exists', () => {
    spyOn(localStorage, 'getItem').and.returnValue(
      JSON.stringify({ language: 'uk' })
    );

    create();

    expect(translateSpy.use).toHaveBeenCalledWith('uk');
  });

  it('should fallback to default when saved settings has no language field', () => {
    spyOn(localStorage, 'getItem').and.returnValue(
      JSON.stringify({ theme: 'dark' })
    );

    create();

    expect(translateSpy.use).toHaveBeenCalledWith('en');
  });

  it('should use browser language when no saved settings exist', () => {
    spyOn(localStorage, 'getItem').and.returnValue(null);

    translateSpy.getBrowserLang.and.returnValue('es');

    create();

    expect(translateSpy.use).toHaveBeenCalledWith('es');
  });

  it('should fallback to en if browser language is undefined', () => {
    spyOn(localStorage, 'getItem').and.returnValue(null);

    translateSpy.getBrowserLang.and.returnValue(undefined);

    create();

    expect(translateSpy.use).toHaveBeenCalledWith('en');
  });

  it('should catch JSON.parse errors and log message', () => {
    spyOn(console, 'error');
  
    spyOn(localStorage, 'getItem').and.returnValue('{bad-json');
  
    new App(translateSpy);
  
    expect(console.error).toHaveBeenCalled();
    expect(translateSpy.use).toHaveBeenCalledWith('en');
  });  
});
