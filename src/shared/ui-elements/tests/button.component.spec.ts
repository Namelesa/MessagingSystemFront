import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from '../buttons';
import { Component } from '@angular/core';

@Component({
  template: `<app-button [type]="type" [disabled]="disabled"></app-button>`,
  standalone: true,
  imports: [ButtonComponent]
})
class TestHostComponent {
  type: 'submit' | 'button' = 'button';
  disabled = false;
}

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let button: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('button');
  });

  it('should create', () => {
    expect(button).toBeTruthy();
  });

  it('should have default type=button', () => {
    expect(button.getAttribute('type')).toBe('button');
  });

  it('should change type to submit', () => {
    host.type = 'submit';
    fixture.detectChanges();
    expect(button.getAttribute('type')).toBe('submit');
  });

  it('should not be disabled by default', () => {
    expect(button.disabled).toBeFalse();
  });

  it('should be disabled when input is true', () => {
    host.disabled = true;
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
  });
});
