import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { PasswordAvatarComponent } from '../password-avatar';

describe('PasswordAvatarComponent', () => {
  let component: PasswordAvatarComponent;
  let fixture: ComponentFixture<PasswordAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordAvatarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordAvatarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update eye offsets on mouse move', () => {
    const event = new MouseEvent('mousemove', { clientX: window.innerWidth, clientY: window.innerHeight });
    component.onMouseMove(event);

    expect(component.eyeOffsetX).not.toBe(0);
    expect(component.eyeOffsetY).not.toBe(0);
  });

  it('should calculate smile path based on passwordLength', () => {
    component.passwordLength = 5;
    const path = component.getSmilePath();
    expect(path).toContain('Q 40');
    expect(path).toContain('52');
  });

  it('should cap smile path at max length 20', () => {
    component.passwordLength = 100;
    const path = component.getSmilePath();
    expect(path).toBe('M 30 52 Q 40 68 50 52');
  });

  it('should schedule and clear blink interval on init/destroy', fakeAsync(() => {
    spyOn(Math, 'random').and.returnValue(0);
    spyOn<any>(component, 'scheduleBlink').and.callThrough();

    component.ngOnInit();
    expect((component as any).scheduleBlink).toHaveBeenCalled();

    expect(component.isBlinking).toBeFalse();

    tick(5000);
    expect(component.isBlinking).toBeTrue();

    tick(150);
    expect(component.isBlinking).toBeFalse();

    component.ngOnDestroy();
  }));

  it('should complete full blink cycle with scheduleBlink', fakeAsync(() => {
    spyOn(Math, 'random').and.returnValue(0.5); 
    
    component['scheduleBlink']();
    
    expect(component.isBlinking).toBeFalse(); 
    
    tick(6000);
    
    expect(component.isBlinking).toBeTrue();
    tick(150);
    
    expect(component.isBlinking).toBeFalse(); 
    
    tick(6000);
    expect(component.isBlinking).toBeTrue();
    
    tick(150);
    expect(component.isBlinking).toBeFalse();
  }));

  it('should blink immediately when blink method is called directly', fakeAsync(() => {
    spyOn(Math, 'random').and.returnValue(0);
    
    component['scheduleBlink']();
    
    expect(component.isBlinking).toBeFalse();

    tick(5000);
    expect(component.isBlinking).toBeTrue();

    tick(150);
    expect(component.isBlinking).toBeFalse();
  }));

  it('should clear timeout on destroy', () => {
    spyOn(window, 'clearTimeout');
    
    component.ngOnInit(); 
    component.ngOnDestroy();
    
    expect(clearTimeout).toHaveBeenCalled();
  });
});