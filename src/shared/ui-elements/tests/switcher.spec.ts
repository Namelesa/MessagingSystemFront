import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwitcherComponent } from '../switchers';
import { By } from '@angular/platform-browser';

describe('SwitcherComponent', () => {
  let component: SwitcherComponent;
  let fixture: ComponentFixture<SwitcherComponent>;
  let inputEl: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SwitcherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default checked=false', () => {
    expect(component.checked).toBeFalse();
    expect(inputEl.checked).toBeFalse();
  });

  it('should reflect input checked value', () => {
    component.checked = true;
    fixture.detectChanges();
    expect(inputEl.checked).toBeTrue();
  });

  it('should emit toggled event on change', () => {
    spyOn(component.toggled, 'emit');

    inputEl.checked = true;
    inputEl.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.toggled.emit).toHaveBeenCalledWith(true);

    inputEl.checked = false;
    inputEl.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.toggled.emit).toHaveBeenCalledWith(false);
  });

  it('onChange should emit correct value', () => {
    spyOn(component.toggled, 'emit');

    const event = { target: { checked: true } } as any as Event;
    component.onChange(event);
    expect(component.toggled.emit).toHaveBeenCalledWith(true);
  });
});
