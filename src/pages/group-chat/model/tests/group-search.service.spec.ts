import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { GroupSearchService } from '../group-search.service';
import { FindUserStore } from '../../../../features/search-user';
import { SearchUser } from '../../../../entities/search-user';

describe('GroupSearchService', () => {
  let service: GroupSearchService;
  let findUserStoreSpy: jasmine.SpyObj<FindUserStore>;
  let userSubject: Subject<SearchUser | null>;

  beforeEach(() => {
    userSubject = new Subject<SearchUser | null>();

    findUserStoreSpy = jasmine.createSpyObj('FindUserStore', ['findUser', 'clearUser'], { user$: userSubject.asObservable() });

    TestBed.configureTestingModule({
      providers: [
        GroupSearchService,
        { provide: FindUserStore, useValue: findUserStoreSpy }
      ]
    });

    service = TestBed.inject(GroupSearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial state', (done) => {
    service.searchState$.subscribe(state => {
      expect(state).toEqual({ isSearchFocused: false, searchQuery: '' });
      done();
    });
  });

  it('should update state on onSearchQueryChange and call findUserStore.findUser if query is not empty', () => {
    const query = 'test';
    service.onSearchQueryChange(query);

    expect(service.state.searchQuery).toBe(query);
    expect(findUserStoreSpy.findUser).toHaveBeenCalledWith(query);
  });

  it('should clear search if onSearchQueryChange called with empty string', () => {
    service.onSearchQueryChange('   ');

    expect(service.state.searchQuery).toBe('');
    expect(service.state.isSearchFocused).toBe(false);
    expect(findUserStoreSpy.clearUser).toHaveBeenCalled();
  });

  it('should set isSearchFocused to true and clear user on onFocus', () => {
    service.onFocus();

    expect(service.state.isSearchFocused).toBe(true);
    expect(findUserStoreSpy.clearUser).toHaveBeenCalled();
  });

  it('should clear state and user on clear', () => {
    service.clear();

    expect(service.state.searchQuery).toBe('');
    expect(service.state.isSearchFocused).toBe(false);
    expect(findUserStoreSpy.clearUser).toHaveBeenCalled();
  });

  it('should expose user$ observable from FindUserStore', (done) => {
    const mockUser: SearchUser = { id: 1, name: 'Alice', nickName: 'Ali', image: 'path/to/image.jpg' } as SearchUser;
    service.user$.subscribe(user => {
      expect(user).toEqual(mockUser);
      done();
    });
    userSubject.next(mockUser);
  });
});
