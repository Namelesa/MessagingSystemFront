import { BehaviorSubject, Subject, combineLatest, merge, Observable, of, defer } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, shareReplay, take, finalize } from 'rxjs/operators';
import { RegisterContract } from '../model/register-contract';
import { RegisterApi } from '../api/register-user.api';
import { RegisterFieldValidationHelper as V } from '../lib/register-validation';
import { AuthApiResult } from '../api/auth-api-result';

type RegisterField = 'firstName' | 'lastName' | 'login' | 'email' | 'nickName' | 'password' | 'image';

export class RegisterFormStore {
  private readonly debounceMs = 300;

  private formData$ = new BehaviorSubject<RegisterContract>({
    firstName: '', lastName: '', email: '', login: '', nickName: '', password: '', image: undefined,
  });

  private touched = new Set<RegisterField>();

  private fieldChanges = {
    firstName: new Subject<string>(),
    lastName: new Subject<string>(),
    login: new Subject<string>(),
    email: new Subject<string>(),
    nickName: new Subject<string>(),
    password: new Subject<string>(),
    image: new Subject<File | undefined>(),
  } as const;

  readonly isSubmitting$ = new BehaviorSubject<boolean>(false);

  readonly fieldErrors$ = {
    firstName: this.mkFieldErrors$('firstName', this.fieldChanges.firstName),
    lastName:  this.mkFieldErrors$('lastName',  this.fieldChanges.lastName),
    login:     this.mkFieldErrors$('login',     this.fieldChanges.login),
    email:     this.mkFieldErrors$('email',     this.fieldChanges.email),
    nickName:  this.mkFieldErrors$('nickName',  this.fieldChanges.nickName),
    password:  this.mkFieldErrors$('password',  this.fieldChanges.password),
    image:     this.mkImageErrors$(this.fieldChanges.image),
  } as const;

  readonly allErrors$: Observable<Record<string, string[]>> = combineLatest([
    this.fieldErrors$.firstName, this.fieldErrors$.lastName, this.fieldErrors$.login,
    this.fieldErrors$.email, this.fieldErrors$.nickName, this.fieldErrors$.password, this.fieldErrors$.image,
  ]).pipe(
    map(([firstName, lastName, login, email, nickName, password, image]) => ({
      firstName, lastName, login, email, nickName, password, image,
    })),
    shareReplay(1)
  );

  readonly isFormComplete$: Observable<boolean> = this.formData$.pipe(
    map(fd => !!(fd.firstName && fd.lastName && fd.login && fd.email && fd.nickName && fd.password && fd.image)),
    shareReplay(1)
  );

  readonly isFormValid$: Observable<boolean> = this.allErrors$.pipe(
    map(errors => Object.values(errors).every(list => list.length === 0)),
    shareReplay(1)
  );

  constructor(private api: RegisterApi) {
    merge(
      this.fieldChanges.firstName.pipe(map(v => ({ firstName: v }))),
      this.fieldChanges.lastName.pipe(map(v => ({ lastName: v }))),
      this.fieldChanges.login.pipe(map(v => ({ login: v }))),
      this.fieldChanges.email.pipe(map(v => ({ email: v }))),
      this.fieldChanges.nickName.pipe(map(v => ({ nickName: v }))),
      this.fieldChanges.password.pipe(map(v => ({ password: v }))),
      this.fieldChanges.image.pipe(map(v => ({ image: v }))),
    ).subscribe(patch => this.formData$.next({ ...this.formData$.value, ...patch }));
  }

  updateField(field: Exclude<RegisterField, 'image'>, value: string) {
    this.touched.add(field);
    (this.fieldChanges[field] as Subject<string>).next(value);
  }

  updateImage(file: File | undefined) {
    this.touched.add('image');
    this.fieldChanges.image.next(file);
  }

  markTouched(field: RegisterField) {
    this.touched.add(field);
  }

  markAllTouched() {
    ;(['firstName','lastName','login','email','nickName','password','image'] as RegisterField[])
      .forEach(f => this.touched.add(f));
  }

  reset() {
    this.formData$.next({
      firstName: '', lastName: '', email: '', login: '', nickName: '', password: '', image: undefined,
    });
    this.touched.clear();
  }

  submit(): Observable<AuthApiResult> {
    return defer(() => combineLatest([this.allErrors$.pipe(take(1)), this.formData$.pipe(take(1))]))
      .pipe(
        switchMap(([errors, data]) => {
          const hasErrors = Object.values(errors).some(x => x.length > 0);
          if (hasErrors) return of({ message: 'Invalid form' } as unknown as AuthApiResult);
          this.isSubmitting$.next(true);
          return this.api.registerUser(data).pipe(finalize(() => this.isSubmitting$.next(false)));
        })
      );
  }

  private mkFieldErrors$(field: Exclude<RegisterField, 'image'>, src$: Subject<string>): Observable<string[]> {
    return src$.pipe(
      debounceTime(this.debounceMs),
      distinctUntilChanged(),
      startWith(''),
      switchMap(value => this.touched.has(field) ? of(V.validateField(field as any, value)) : of([])),
      shareReplay(1)
    );
  }

  private mkImageErrors$(src$: Subject<File | undefined>): Observable<string[]> {
    return src$.pipe(
      startWith(undefined),
      switchMap(file => this.touched.has('image') ? of(V.validateImage(file)) : of([])),
      shareReplay(1)
    );
  }

  getValue(): RegisterContract { return this.formData$.value; }
}