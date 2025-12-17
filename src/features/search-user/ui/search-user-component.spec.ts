import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchUserComponent } from './search-user-component';
import { FindUserStore } from '../model/search-user-store';
import { BehaviorSubject } from 'rxjs';

describe('SearchUserComponent', () => {
  let component: SearchUserComponent;
  let fixture: ComponentFixture<SearchUserComponent>;
  let mockStore: jasmine.SpyObj<FindUserStore>;
  let userSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    userSubject = new BehaviorSubject(null);
    mockStore = jasmine.createSpyObj('FindUserStore', ['findUser', 'clearUser'], {
      user$: userSubject.asObservable()
    });

    await TestBed.configureTestingModule({
      imports: [SearchUserComponent],
      providers: [
        { provide: FindUserStore, useValue: mockStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize user$ from store', () => {
    expect(component.user$).toBe(mockStore.user$);
  });

  describe('onSearchChange', () => {
    it('should search user when query is not empty', () => {
      spyOn(component.searchQueryChange, 'emit');
      spyOn(component.searchActiveChange, 'emit');

      component.onSearchChange('john');

      expect(component.searchQuery).toBe('john');
      expect(component.searchQueryChange.emit).toHaveBeenCalledWith('john');
      expect(mockStore.findUser).toHaveBeenCalledWith('john');
      expect(component.searchActiveChange.emit).toHaveBeenCalledWith(true);
    });

    it('should trim query and search', () => {
      component.onSearchChange('  john  ');

      expect(mockStore.findUser).toHaveBeenCalledWith('john');
    });

    it('should clear user when query is empty', () => {
      spyOn(component.searchActiveChange, 'emit');

      component.onSearchChange('');

      expect(mockStore.clearUser).toHaveBeenCalled();
      expect(component.searchActiveChange.emit).toHaveBeenCalledWith(false);
      expect(mockStore.findUser).not.toHaveBeenCalled();
    });

    it('should clear user when query is only spaces', () => {
      component.onSearchChange('   ');

      expect(mockStore.clearUser).toHaveBeenCalled();
      expect(mockStore.findUser).not.toHaveBeenCalled();
    });
  });

  describe('onClearSearch', () => {
    it('should clear search query and user', () => {
      spyOn(component.searchActiveChange, 'emit');
      
      component.searchQuery = 'john';
      component.onClearSearch();

      expect(component.searchQuery).toBe('');
      expect(mockStore.clearUser).toHaveBeenCalled();
      expect(component.searchActiveChange.emit).toHaveBeenCalledWith(false);
    });
  });

  describe('startChat', () => {
    it('should emit foundedUser and clear search', () => {
      spyOn(component.foundedUser, 'emit');
      spyOn(component, 'onClearSearch');

      component.startChat('john', 'avatar.jpg');

      expect(component.foundedUser.emit).toHaveBeenCalledWith({ 
        nick: 'john', 
        image: 'avatar.jpg' 
      });
      expect(component.onClearSearch).toHaveBeenCalled();
    });
  });

  describe('Input properties', () => {
    it('should set isSearchActive input', () => {
      component.isSearchActive = true;
      expect(component.isSearchActive).toBe(true);
    });
  });
});