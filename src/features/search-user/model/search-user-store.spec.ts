import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FindUserStore } from './search-user-store';
import { FindUserApi } from '../api/search-user.api';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

describe('FindUserStore', () => {
  let store: FindUserStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FindUserStore],
    });

    store = TestBed.inject(FindUserStore);
  });

  it('should initialize user$ as null', fakeAsync(() => {
    let value: any;
    store.user$.subscribe(user => value = user);
    tick(); 
    expect(value).toBeNull();
  }));

  it('should set user$ with fetched user data on successful findUser', fakeAsync(() => {
    spyOn(FindUserApi.prototype, 'searchUser').and.returnValue(
      of({ 
        success: true,
        message: 'User found',
        data: { nickName: 'john', image: 'img' } 
      })
    );

    let value: any;
    store.user$.subscribe(user => value = user);

    store.findUser('john');
    tick();

    expect(value).toEqual({ nickName: 'john', image: 'img' });
    expect(FindUserApi.prototype.searchUser).toHaveBeenCalledWith('john');
  }));

  it('should set user$ to null on error', fakeAsync(() => {
    spyOn(FindUserApi.prototype, 'searchUser').and.returnValue(
      throwError(() => new Error('fail'))
    );

    let value: any;
    store.user$.subscribe(user => value = user);

    store.findUser('error');
    tick();

    expect(value).toBeNull();
    expect(FindUserApi.prototype.searchUser).toHaveBeenCalledWith('error');
  }));

  it('should clear user$ when clearUser is called', fakeAsync(() => {
    spyOn(FindUserApi.prototype, 'searchUser').and.returnValue(
      of({ 
        success: true,
        message: 'User found',
        data: { nickName: 'john', image: 'img' } 
      })
    );

    let value: any;
    store.user$.subscribe(user => value = user);

    store.findUser('john');
    tick();
    expect(value).toEqual({ nickName: 'john', image: 'img' });

    store.clearUser();
    tick();

    expect(value).toBeNull();
  }));

  it('should handle multiple findUser calls', fakeAsync(() => {
    spyOn(FindUserApi.prototype, 'searchUser').and.callFake((nick: string) => {
      return of({ 
        success: true,
        message: 'User found',
        data: { nickName: nick, image: 'img' } 
      });
    });

    let value: any;
    store.user$.subscribe(user => value = user);
  
    store.findUser('user1');
    tick();
    expect(value).toEqual({ nickName: 'user1', image: 'img' });
  
    store.findUser('user2');
    tick();
    expect(value).toEqual({ nickName: 'user2', image: 'img' });
    
    expect(FindUserApi.prototype.searchUser).toHaveBeenCalledTimes(2);
    expect(FindUserApi.prototype.searchUser).toHaveBeenCalledWith('user1');
    expect(FindUserApi.prototype.searchUser).toHaveBeenCalledWith('user2');
  }));
  
  it('should call api.searchUser with correct parameter', () => {
    spyOn(FindUserApi.prototype, 'searchUser').and.returnValue(
      of({ 
        success: true,
        message: 'User found',
        data: { nickName: 'testuser', image: 'img' } 
      })
    );

    store.findUser('testuser');
    
    expect(FindUserApi.prototype.searchUser).toHaveBeenCalledWith('testuser');
  });
});