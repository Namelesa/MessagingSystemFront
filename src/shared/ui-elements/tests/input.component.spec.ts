import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputComponent } from '../inputs';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { By } from '@angular/platform-browser';

describe('InputComponent', () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;
  let inputEl: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComponent, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
    inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should have default type=text', () => {
    expect(inputEl.type).toBe('text');
  });

  it('should use provided placeholder if no errors', () => {
    component.placeholder = 'Enter text';
    fixture.detectChanges();
    expect(inputEl.placeholder).toBe('Enter text');
  });

  it('should show first error as placeholder when errors exist', () => {
    component.placeholder = 'Default';
    component.errors = ['Required field', 'Too short'];
    fixture.detectChanges();
    expect(inputEl.placeholder).toBe('Required field');
  });

  it('should update value when writeValue is called', () => {
    component.writeValue('test123');
    fixture.detectChanges();
    expect(component.value).toBe('test123');
    expect(inputEl.value).toBe('test123');
  });

  it('should call onChange when value changes', () => {
    const spy = jasmine.createSpy('onChange');
    component.registerOnChange(spy);

    inputEl.value = 'newValue';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('newValue');
  });

  it('should call onTouched when blurred', () => {
    const spy = jasmine.createSpy('onTouched');
    component.registerOnTouched(spy);

    inputEl.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalled();
  });

  it('should apply required attribute when set', () => {
    component.required = true;
    fixture.detectChanges();
    expect(inputEl.required).toBeTrue();
  });

  it('should apply autocomplete attribute', () => {
    component.autocomplete = 'off';
    fixture.detectChanges();
    expect(inputEl.autocomplete).toBe('off');
  });

  it('should apply name attribute', () => {
    component.name = 'username';
    fixture.detectChanges();
    expect(inputEl.name).toBe('username');
  });

  it('should execute default onChange and onTouched without errors', () => {
    expect(() => component['onChange']('value')).not.toThrow();
    expect(() => component['onTouched']()).not.toThrow();
  });

  it('should return correct hasErrors value when errors array is empty', () => {
    component.errors = [];
    expect(component.hasErrors).toBeFalse();
  });
  
  it('should provide NG_VALUE_ACCESSOR', () => {
    const valueAccessor = fixture.debugElement.injector.get(NG_VALUE_ACCESSOR);
    expect(valueAccessor).toContain(component);
  });
});
