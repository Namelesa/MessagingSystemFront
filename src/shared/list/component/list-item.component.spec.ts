import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListItemComponent } from './list-item.component';
import { Component, ViewChild } from '@angular/core';

@Component({
  standalone: true,
  imports: [ListItemComponent],
  template: `
    <shared-list-item [name]="name" [image]="image" [active]="active" (click)="onClick()">
      <ng-template #icon>icon</ng-template>
    </shared-list-item>
  `
})
class TestHostComponent {
  name = 'Test Name';
  image = 'test.png';
  active = true;
  clicked = false;
  onClick() { this.clicked = true; }
  @ViewChild(ListItemComponent) listItem!: ListItemComponent;
}

describe('ListItemComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(host.listItem).toBeTruthy();
  });

  it('should accept inputs', () => {
    expect(host.listItem.name).toBe('Test Name');
    expect(host.listItem.image).toBe('test.png');
    expect(host.listItem.active).toBeTrue();
  });

  it('should emit click event', () => {
    host.listItem.click.emit();
    expect(host.clicked).toBeTrue();
  });

  it('should detect icon content', () => {
    expect(host.listItem.hasIconContent()).toBeTrue();
  });

  it('should set active to false on escape key press', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    fixture.detectChanges();
    expect(host.listItem.active).toBeFalse();
  });
});
