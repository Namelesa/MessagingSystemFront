import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FindUserApi } from './search-user.api';
import { environment } from '../../../shared/api-urls';
import { ApiResponse } from '../../../shared/api-result';
import { SearchUser } from '../../../entities/search-user';

describe('FindUserApi', () => {
  let api: FindUserApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FindUserApi]
    });

    api = TestBed.inject(FindUserApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should make GET request with correct URL and options', () => {
    const mockNick = 'john';
    const mockResponse: ApiResponse<SearchUser> = { 
      success: true, 
      message: null, 
      data: { nickName: 'TestUser', image: 'testImage' } 
    };

    api.searchUser(mockNick).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.messagingApiUrl}find-user?nickName=${mockNick}`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();

    req.flush(mockResponse);
  });

  it('should handle empty response', () => {
    const mockNick = 'noone';
    const mockResponse: ApiResponse<SearchUser> = { 
      success: true, 
      message: 'No user found', 
      data: null as any 
    };

    api.searchUser(mockNick).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.messagingApiUrl}find-user?nickName=${mockNick}`);
    req.flush(mockResponse);
  });

  it('should handle HTTP error', () => {
    const mockNick = 'error';

    api.searchUser(mockNick).subscribe({
      next: () => fail('should have failed with 500 error'),
      error: err => {
        expect(err.status).toBe(500);
      }
    });

    const req = httpMock.expectOne(`${environment.messagingApiUrl}find-user?nickName=${mockNick}`);
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });
  });
});
