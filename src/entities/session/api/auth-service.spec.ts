import { BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { StorageService } from '../../../shared/storage';
import { ProfileApiResult } from '../../../entities/session';
import { environment } from '../../../shared/api-urls';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let storageServiceMock: jasmine.SpyObj<StorageService>;

  const mockProfile: ProfileApiResult = {
    statusCode: '200',
    firstName: 'Test',
    lastName: 'User',
    login: 'testUser',
    email: 'test@example.com',
    nickName: 'testUser',
    image: 'https://example.com/avatar.jpg'
  };

  const mockProfileWithoutImage: ProfileApiResult = {
    statusCode: '200',
    firstName: 'Test',
    lastName: 'User',
    login: 'testUser',
    email: 'test@example.com',
    nickName: 'testUser',
    image: undefined
  };

  beforeEach(async () => {
    const storageServiceSpy = jasmine.createSpyObj('StorageService', ['get', 'set', 'remove']);
    
    storageServiceSpy.get.and.returnValue(Promise.resolve(null));
    storageServiceSpy.set.and.returnValue(Promise.resolve());
    storageServiceSpy.remove.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: StorageService, useValue: storageServiceSpy }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    storageServiceMock = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Initialization', () => {
    it('should create the service', (done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => {
        expect(service).toBeTruthy();
        done();
      });
    });

    it('should initialize with no stored nickname', (done) => {
      storageServiceMock.get.and.returnValue(Promise.resolve(null));
      
      const newService = new AuthService(httpClient, storageServiceMock);

      newService.waitForAuthInit().subscribe(result => {
        expect(result).toBe(true);
        expect(newService.getNickName()).toBeNull();
        done();
      });
    });

    it('should initialize with stored nickname and successful auth check', (done) => {
      storageServiceMock.get.and.returnValue(Promise.resolve('storedUser'));
      
      const newService = new AuthService(httpClient, storageServiceMock);

      newService.waitForAuthInit().subscribe(result => {
        expect(result).toBe(true);
        expect(newService.getNickName()).toBe('storedUser');
        done();
      });

      setTimeout(() => {
        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=storedUser`);
        req.flush(mockProfile);
      });
    });

    it('should initialize with stored nickname and failed auth check', (done) => {
      storageServiceMock.get.and.returnValue(Promise.resolve('storedUser'));
      
      const newService = new AuthService(httpClient, storageServiceMock);

      newService.waitForAuthInit().subscribe(result => {
        expect(result).toBe(true);
        expect(newService.getNickName()).toBe('storedUser');
        done();
      });

      setTimeout(() => {
        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=storedUser`);
        req.error(new ErrorEvent('Auth failed'));
      });
    });
  });

  describe('setNickName', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should set nickname and save to storage', async () => {
      storageServiceMock.set.and.returnValue(Promise.resolve('newUser'));

      await service.setNickName('newUser');

      expect(service.getNickName()).toBe('newUser');
      expect(storageServiceMock.set).toHaveBeenCalledWith('nickName', 'newUser');
    });

    it('should handle storage error when setting nickname', async () => {
      const storageError = new Error('Storage error');
      storageServiceMock.set.and.returnValue(Promise.reject(storageError));

      try {
        await service.setNickName('newUser');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBe(storageError);
      }
    });
  });

  describe('getNickName', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should return current nickname', async () => {
      await service.setNickName('testUser');
      expect(service.getNickName()).toBe('testUser');
    });

    it('should return null when no nickname is set', () => {
      expect(service.getNickName()).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should fetch user profile successfully', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe(profile => {
          expect(profile).toEqual(mockProfile);
          
          service.isLoggedIn$.subscribe(isLoggedIn => {
            expect(isLoggedIn).toBe(true);
          });
          
          service.userProfile$.subscribe(userProfile => {
            expect(userProfile).toEqual(mockProfile);
          });
          
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        expect(req.request.method).toBe('GET');
        expect(req.request.withCredentials).toBe(true);
        req.flush(mockProfile);
      });
    });

    it('should throw error when nickname is not set', () => {
      expect(() => service.getUserProfile()).toThrowError('User nickname is not set');
    });

    it('should handle HTTP error and update subjects', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe({
          error: (error) => {
            expect(error).toBeDefined();
            
            setTimeout(() => {
              service.isLoggedIn$.subscribe(isLoggedIn => {
                expect(isLoggedIn).toBe(false);
              });
              
              service.userProfile$.subscribe(profile => {
                expect(profile).toBeNull();
              });
              
              done();
            });
          }
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.error(new ErrorEvent('Network error'));
      });
    });
  });

  describe('getCurrentProfile', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should return current profile from subject', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe(() => {
          const currentProfile = service.getCurrentProfile();
          expect(currentProfile).toEqual(mockProfile);
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });

    it('should return null when no profile is loaded', () => {
      expect(service.getCurrentProfile()).toBeNull();
    });
  });

  describe('checkAuth', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should return false when no nickname is set', (done) => {
      service.checkAuth().subscribe(result => {
        expect(result).toBe(false);
        done();
      });
    });

    it('should return true and update subjects on successful auth check', (done) => {
      service.setNickName('testUser').then(() => {
        service.checkAuth().subscribe(result => {
          expect(result).toBe(true);
          
          service.isLoggedIn$.subscribe(isLoggedIn => {
            expect(isLoggedIn).toBe(true);
          });
          
          service.userProfile$.subscribe(profile => {
            expect(profile).toEqual(mockProfile);
          });
          
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });

    it('should return false and reset subjects on failed auth check', (done) => {
      service.setNickName('testUser').then(() => {
        service.checkAuth().subscribe(result => {
          expect(result).toBe(false);
          
          service.isLoggedIn$.subscribe(isLoggedIn => {
            expect(isLoggedIn).toBe(false);
          });
          
          service.userProfile$.subscribe(profile => {
            expect(profile).toBeNull();
          });
          
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.error(new ErrorEvent('Auth failed'));
      });
    });
  });

  describe('setLoggedIn', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should set logged in status to true', (done) => {
      service.setLoggedIn(true).then(() => {
        service.isLoggedIn$.subscribe(status => {
          expect(status).toBe(true);
          done();
        });
      });
    });

    it('should set logged in status to false and clear data', (done) => {
      service.setNickName('testUser').then(() => {
        return service.setLoggedIn(false);
      }).then(() => {
        service.isLoggedIn$.subscribe(status => {
          expect(status).toBe(false);
        });
        
        service.userProfile$.subscribe(profile => {
          expect(profile).toBeNull();
        });
        
        expect(service.getNickName()).toBeNull();
        expect(storageServiceMock.remove).toHaveBeenCalledWith('nickName');
        done();
      });
    });

    it('should handle storage error when setting logged in to false', async () => {
      const storageError = new Error('Storage remove error');
      storageServiceMock.remove.and.returnValue(Promise.reject(storageError));
      
      await service.setNickName('testUser');
      
      try {
        await service.setLoggedIn(false);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBe(storageError);
      }
    });
  });

  describe('getUserAvatarUrl', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should return avatar URL from current profile', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe(() => {
          const avatarUrl = service.getUserAvatarUrl();
          expect(avatarUrl).toBe('https://example.com/avatar.jpg');
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });

    it('should return undefined when no profile is loaded', () => {
      const avatarUrl = service.getUserAvatarUrl();
      expect(avatarUrl).toBeUndefined();
    });

    it('should return undefined when profile has no image', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe(() => {
          const avatarUrl = service.getUserAvatarUrl();
          expect(avatarUrl).toBeUndefined();
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfileWithoutImage);
      });
    });
  });

  describe('logout', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should clear auth data and return true', (done) => {
      service.setNickName('testUser').then(() => {
        service.logout().subscribe(result => {
          expect(result).toBe(true);
          expect(service.getNickName()).toBeNull();
          
          service.isLoggedIn$.subscribe(status => {
            expect(status).toBe(false);
          });
          
          service.userProfile$.subscribe(profile => {
            expect(profile).toBeNull();
          });
          
          expect(storageServiceMock.remove).toHaveBeenCalledWith('nickName');
          done();
        });
      });
    });

    it('should handle storage error during logout', (done) => {
      const storageError = new Error('Storage error during logout');
      storageServiceMock.remove.and.returnValue(Promise.reject(storageError));
      
      service.setNickName('testUser').then(() => {
        service.logout().subscribe({
          error: (error) => {
            expect(error).toBe(storageError);
            done();
          }
        });
      });
    });
  });

  describe('waitForAuthInit', () => {
    it('should return true immediately if auth is already initialized', (done) => {
      service = TestBed.inject(AuthService);
      
      service.waitForAuthInit().subscribe(() => {
        service.waitForAuthInit().subscribe(result => {
          expect(result).toBe(true);
          done();
        });
      });
    });

    it('should wait for auth init when not initialized yet', (done) => {
      storageServiceMock.get.and.returnValue(new Promise(() => {})); 
      
      const newService = new AuthService(httpClient, storageServiceMock);
      
      let resolved = false;
      newService.waitForAuthInit().subscribe(() => {
        resolved = true;
        done();
      });
      
      setTimeout(() => {
        expect(resolved).toBe(false);
        (newService as any).authInitialized = true;
        (newService as any).authInitSubject.next(true);
      }, 10);
    });
  });

  describe('Observable streams', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should emit login status changes', (done) => {
      const statusChanges: boolean[] = [];
      
      service.isLoggedIn$.subscribe(status => {
        statusChanges.push(status);
        
        if (statusChanges.length === 3) {
          expect(statusChanges).toEqual([false, true, false]);
          done();
        }
      });
      
      service.setLoggedIn(true).then(() => {
        return service.setLoggedIn(false);
      });
    });

    it('should emit profile changes', (done) => {
      const profileChanges: (ProfileApiResult | null)[] = [];
      
      service.userProfile$.subscribe(profile => {
        profileChanges.push(profile);
        
        if (profileChanges.length === 2) {
          expect(profileChanges[0]).toBeNull();
          expect(profileChanges[1]).toEqual(mockProfile);
          done();
        }
      });
      
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe();
        
        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });
  });

  describe('clearLocalAuthData (private method coverage)', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should clear all auth data when clearLocalAuthData is called', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe(() => {
          service.logout().subscribe(() => {
            expect(service.getNickName()).toBeNull();
            expect(service.getCurrentProfile()).toBeNull();
            
            service.isLoggedIn$.subscribe(status => {
              expect(status).toBe(false);
            });
            
            done();
          });
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });
  });

  describe('Error handling in constructor', () => {
    it('should handle storage service error during initialization', (done) => {
      storageServiceMock.get.and.returnValue(Promise.reject('Storage error'));
      
      const newService = new AuthService(httpClient, storageServiceMock);
      
      newService.waitForAuthInit().subscribe(result => {
        expect(result).toBe(true);
        expect(newService.getNickName()).toBeNull();
        done();
      });
    });
  });

  describe('Complete initialization flow coverage', () => {
    it('should properly handle successful auth during initialization', (done) => {
      storageServiceMock.get.and.returnValue(Promise.resolve('storedNick'));
      
      const newService = new AuthService(httpClient, storageServiceMock);
      
      newService.waitForAuthInit().subscribe(() => {
        newService.isLoggedIn$.subscribe(isLoggedIn => {
          expect(isLoggedIn).toBe(true);
        });
        
        newService.userProfile$.subscribe(profile => {
          expect(profile).toEqual(mockProfile);
        });
        
        done();
      });
      
      setTimeout(() => {
        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=storedNick`);
        req.flush(mockProfile);
      });
    });
  });

  describe('Additional edge cases for 100% coverage', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should handle multiple consecutive setLoggedIn calls', async () => {
      await service.setNickName('testUser');
      
      await service.setLoggedIn(true);
      let isLoggedIn = false;
      service.isLoggedIn$.subscribe(status => isLoggedIn = status);
      expect(isLoggedIn).toBe(true);
      
      await service.setLoggedIn(false);
      expect(service.getNickName()).toBeNull();
      
      await service.setLoggedIn(true);
      service.isLoggedIn$.subscribe(status => isLoggedIn = status);
      expect(isLoggedIn).toBe(true);
    });

    it('should handle checkAuth with empty response', (done) => {
      service.setNickName('testUser').then(() => {
        service.checkAuth().subscribe(result => {
          expect(result).toBe(true);
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(null);
      });
    });

    it('should handle getUserProfile with different HTTP errors', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe({
          error: (error) => {
            expect(error.status).toBe(401);
            
            service.isLoggedIn$.subscribe(isLoggedIn => {
              expect(isLoggedIn).toBe(false);
            });
            
            done();
          }
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      });
    });

    it('should handle switchMap in constructor with checkAuth returning false', (done) => {
      storageServiceMock.get.and.returnValue(Promise.resolve('badUser'));
      
      const newService = new AuthService(httpClient, storageServiceMock);
      
      newService.waitForAuthInit().subscribe(result => {
        expect(result).toBe(true);
        expect(newService.getNickName()).toBe('badUser');
      
        newService.isLoggedIn$.subscribe(isLoggedIn => {
          expect(isLoggedIn).toBe(false);
        });
        
        done();
      });
      
      setTimeout(() => {
        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=badUser`);
        req.error(new ErrorEvent('Unauthorized'));
      });
    });

    it('should properly handle tap operator in getUserProfile', (done) => {
      service.setNickName('testUser').then(() => {
        let profileUpdated = false;
        let loginStatusUpdated = false;
        
        service.userProfile$.subscribe(profile => {
          if (profile) profileUpdated = true;
        });
        
        service.isLoggedIn$.subscribe(status => {
          if (status) loginStatusUpdated = true;
        });
        
        service.getUserProfile().subscribe(profile => {
          expect(profile).toEqual(mockProfile);
          expect(profileUpdated).toBe(true);
          expect(loginStatusUpdated).toBe(true);
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });

    it('should handle clearLocalAuthData method completely', async () => {
      await service.setNickName('testUser');
      
      (service as any).userProfileSubject.next(mockProfile);
      (service as any).isLoggedInSubject.next(true);
      
      expect(service.getCurrentProfile()).toEqual(mockProfile);
      
      service.logout().subscribe(result => {
        expect(result).toBe(true);
      });
      
      expect(service.getNickName()).toBeNull();
      expect(service.getCurrentProfile()).toBeNull();
    });

    it('should handle from() operator in constructor error path', (done) => {
      const storageError = new Error('Storage connection failed');
      storageServiceMock.get.and.returnValue(Promise.reject(storageError));
      
      const newService = new AuthService(httpClient, storageServiceMock);
      
      newService.waitForAuthInit().subscribe(result => {
        expect(result).toBe(true);
        expect(newService.getNickName()).toBeNull();
        done();
      });
    });

    it('should handle all branches in setLoggedIn method', async () => {
      await service.setLoggedIn(true);
      let currentStatus = false;
      service.isLoggedIn$.subscribe(status => currentStatus = status);
      expect(currentStatus).toBe(true);
      
      await service.setNickName('testUser');
      (service as any).userProfileSubject.next(mockProfile);
      
      await service.setLoggedIn(false);
      
      service.isLoggedIn$.subscribe(status => currentStatus = status);
      expect(currentStatus).toBe(false);
      expect(service.getNickName()).toBeNull();
      expect(service.getCurrentProfile()).toBeNull();
    });

    it('should test filter and take operators in waitForAuthInit', (done) => {
      const newService = Object.create(AuthService.prototype);
      newService.authInitialized = false;
      newService.authInitSubject = new BehaviorSubject<boolean>(false);
      
      let subscriptionCount = 0;
      
      newService.waitForAuthInit().subscribe((result: boolean) => {
        subscriptionCount++;
        expect(result).toBe(true);
        
        if (subscriptionCount === 2) {
          done();
        }
      });

      newService.waitForAuthInit().subscribe((result: boolean) => {
        subscriptionCount++;
        expect(result).toBe(true);
        
        if (subscriptionCount === 2) {
          done();
        }
      });
      
      setTimeout(() => {
        newService.authInitSubject.next(false); 
        newService.authInitSubject.next(true);  
        newService.authInitSubject.next(true); 
      }, 10);
    });

    it('should handle HTTP request parameters correctly', (done) => {
      service.setNickName('user@test.com').then(() => {
        service.getUserProfile().subscribe();

        const req = httpMock.expectOne((request) => {
          return request.url === `${environment.apiUrl}user/profile` &&
                 request.params.get('nickName') === 'user@test.com' &&
                 request.withCredentials === true;
        });
        
        expect(req.request.method).toBe('GET');
        req.flush(mockProfile);
        done();
      });
    });
  });
});