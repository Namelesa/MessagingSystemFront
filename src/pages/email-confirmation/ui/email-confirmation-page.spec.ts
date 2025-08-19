import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { EmailConfirmedPageComponent } from './email-confirmation-page';

describe('EmailConfirmedPageComponent', () => {
  let component: EmailConfirmedPageComponent;
  let fixture: ComponentFixture<EmailConfirmedPageComponent>;

  function createComponentWithParams(params: any) {
    TestBed.configureTestingModule({
      imports: [EmailConfirmedPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of(params) }
        }
      ]
    });
    fixture = TestBed.createComponent(EmailConfirmedPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create the component', () => {
    createComponentWithParams({});
    expect(component).toBeTruthy();
  });

  it('should set status and message from query params', () => {
    createComponentWithParams({ status: 'success', message: 'ok' });
    expect(component.status).toBe('success');
    expect(component.message).toBe('ok');
  });

  it('should set message to empty string if not provided in query params', () => {
    createComponentWithParams({ status: 'error' });
    expect(component.status).toBe('error');
    expect(component.message).toBe('');
  });
});
