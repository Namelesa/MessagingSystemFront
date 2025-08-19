import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthPageLayoutComponent } from './auth.component';
import { PasswordAvatarComponent } from '../../../shared/ui-elements';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [AuthPageLayoutComponent],
  template: `
    <auth-page-layout
      [title]="title"
      [subtitle]="subtitle"
      [bottomText]="bottomText"
      [bottomLink]="bottomLink"
      [isPasswordVisible]="isPasswordVisible"
      [passwordLength]="passwordLength"
    ></auth-page-layout>
  `
})
class TestHostComponent {
  title = 'Login';
  subtitle = 'Enter your credentials';
  bottomText = 'No account?';
  bottomLink = { href: '/register', text: 'Register' };
  isPasswordVisible = true;
  passwordLength = 8;
}

describe('AuthPageLayoutComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        PasswordAvatarComponent,
        TestHostComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should pass inputs to AuthPageLayoutComponent', () => {
    const comp = fixture.debugElement.children[0].componentInstance as AuthPageLayoutComponent;
    expect(comp.title).toBe('Login');
    expect(comp.subtitle).toBe('Enter your credentials');
    expect(comp.bottomText).toBe('No account?');
    expect(comp.bottomLink).toEqual({ href: '/register', text: 'Register' });
    expect(comp.isPasswordVisible).toBeTrue();
    expect(comp.passwordLength).toBe(8);
  });

  it('should update inputs when host properties change', () => {
    const host = fixture.componentInstance;
    host.title = 'Register';
    host.isPasswordVisible = false;
    host.passwordLength = 12;
    fixture.detectChanges();

    const comp = fixture.debugElement.children[0].componentInstance as AuthPageLayoutComponent;
    expect(comp.title).toBe('Register');
    expect(comp.isPasswordVisible).toBeFalse();
    expect(comp.passwordLength).toBe(12);
  });
});