// input.component.ts
import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor {
  @Input() hasSuffix: boolean = false;
  @Input() type: string = 'text';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() name = '';
  @Input() errors: string[] = [];

  private _value: any = '';

  private onChange = (value: any) => {};
  private onTouched = () => {};

  get value(): any {
    return this._value;
  }

  set value(val: any) {
    this._value = val;
    this.onChange(val);
  }

  get hasErrors(): boolean {
    return this.errors && this.errors.length > 0;
  }

  get currentPlaceholder(): string {
    return this.hasErrors ? this.errors[0] : this.placeholder;
  }

  writeValue(value: any): void {
    this._value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
  }
  
  onBlur(): void {
    this.onTouched();
  }
}