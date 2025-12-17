import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchInputComponent } from './search-input.component';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [SearchInputComponent, FormsModule],
  template: `<shared-search-input 
               [query]="query" 
               [placeholder]="placeholder"
               (queryChange)="onQueryChange($event)"
               (search)="onSearch()"
               (clear)="onClear()"
               (focus)="onFocus()">
             </shared-search-input>`
})
class TestHostComponent {
  query = 'initial';
  placeholder = 'Type here';
  queryChanged = '';
  searched = false;
  cleared = false;
  focused = false;

  @ViewChild(SearchInputComponent) inputComponent!: SearchInputComponent;

  onQueryChange(value: string) { this.queryChanged = value; }
  onSearch() { this.searched = true; }
  onClear() { this.cleared = true; }
  onFocus() { this.focused = true; }
}

describe('SearchInputComponent', () => {
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
    expect(host.inputComponent).toBeTruthy();
  });

  it('should accept inputs', () => {
    expect(host.inputComponent.query).toBe('initial');
    expect(host.inputComponent.placeholder).toBe('Type here');
  });

  it('should emit queryChange', () => {
    host.inputComponent.queryChange.emit('new value');
    expect(host.queryChanged).toBe('new value');
  });

  it('should emit search', () => {
    host.inputComponent.search.emit();
    expect(host.searched).toBeTrue();
  });

  it('should emit clear', () => {
    host.inputComponent.clear.emit();
    expect(host.cleared).toBeTrue();
  });

  it('should emit focus', () => {
    host.inputComponent.focus.emit();
    expect(host.focused).toBeTrue();
  });
});
