import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmailService, User } from './email-confirmation.service';

describe('EmailService', () => {
  let service: EmailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmailService]
    });

    service = TestBed.inject(EmailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('createUser should POST user and return created user', () => {
    const mockUser: User = { nickName: 'John', key: '123' };

    service.createUser(mockUser).subscribe(result => {
      expect(result).toEqual(mockUser);
    });

    const req = httpMock.expectOne('http://localhost:3000/api/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockUser);

    req.flush(mockUser);
  });

  it('generateKey should generate a valid base64 encoded string', async () => {
    const base64 = await service.generateKey();

    expect(typeof base64).toBe('string');
    expect(() => atob(base64)).not.toThrow();
  });

  it('arrayBufferToBase64 should correctly convert Uint8Array to base64', () => {
    const uint8 = new Uint8Array([72, 105]); 
    const expected = btoa("Hi");
    const result = service['arrayBufferToBase64'](uint8);

    expect(result).toBe(expected);
  });

  it('arrayBufferToBase64 should convert ArrayBuffer to base64', () => {
    const buffer = new Uint8Array([65, 66, 67]).buffer; 
    const expected = btoa("ABC");

    const result = service['arrayBufferToBase64'](buffer);

    expect(result).toBe(expected);
  });
});
