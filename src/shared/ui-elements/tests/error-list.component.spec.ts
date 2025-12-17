import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorListComponent } from '../error-list';

describe('ErrorListComponent', () => {
  let component: ErrorListComponent;
  let fixture: ComponentFixture<ErrorListComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorListComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not render list if errors is empty', () => {
    component.errors = [];
    fixture.detectChanges();
    expect(element.querySelector('ul')).toBeNull();
  });

  it('should render list items when errors are provided', () => {
    component.errors = ['Error 1', 'Error 2'];
    fixture.detectChanges();

    const items = element.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent?.trim()).toBe('Error 1');
    expect(items[1].textContent?.trim()).toBe('Error 2');
  });

  it('should update the rendered list when errors change', () => {
    component.errors = ['Error A'];
    fixture.detectChanges();

    let items = element.querySelectorAll('li');
    expect(items.length).toBe(1);
    expect(items[0].textContent?.trim()).toBe('Error A');

    component.errors = ['Error B', 'Error C'];
    fixture.detectChanges();

    items = element.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent?.trim()).toBe('Error B');
    expect(items[1].textContent?.trim()).toBe('Error C');
  });
});
