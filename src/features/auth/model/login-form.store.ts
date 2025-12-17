import { BehaviorSubject, Subject, combineLatest, merge, Observable, of, defer } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, shareReplay, take, finalize } from 'rxjs/operators';
import { LoginContract } from '../../../entities/user';
import { AuthApiResult } from '../../../entities/user';
import { LoginApi } from '../api/login-user.api';
import { LoginFieldValidationHelper as V } from '../lib/login-validation';

type LoginField = 'login' | 'nickName' | 'password';

export class LoginFormStore {
  private readonly debounceMs = 300;

  private formData$ = new BehaviorSubject<LoginContract>({
    login: '', nickName: '', password: '',
  });

  private touched = new Set<LoginField>();

  private fieldChanges = {
    login: new Subject<string>(),
    nickName: new Subject<string>(),
    password: new Subject<string>(),
  } as const;

  readonly isSubmitting$ = new BehaviorSubject<boolean>(false);

  readonly fieldErrors$ = {
    login: this.mkFieldErrors$('login', this.fieldChanges.login),
    nickName: this.mkFieldErrors$('nickName', this.fieldChanges.nickName),
    password: this.mkFieldErrors$('password', this.fieldChanges.password),
  } as const;

  readonly allErrors$: Observable<Record<string, string[]>> = combineLatest([
    this.fieldErrors$.login, this.fieldErrors$.nickName, this.fieldErrors$.password,
  ]).pipe(
    map(([login, nickName, password]) => ({ login, nickName, password })),
    shareReplay(1)
  );

  readonly isFormComplete$: Observable<boolean> = this.formData$.pipe(
    map(fd => !!(fd.login && fd.nickName && fd.password)),
    shareReplay(1)
  );

  readonly isFormValid$: Observable<boolean> = this.allErrors$.pipe(
    map(errors => Object.values(errors).every(list => list.length === 0)),
    shareReplay(1)
  );

  constructor(private api: LoginApi) {
    merge(
      this.fieldChanges.login.pipe(map(v => ({ login: v }))),
      this.fieldChanges.nickName.pipe(map(v => ({ nickName: v }))),
      this.fieldChanges.password.pipe(map(v => ({ password: v }))),
    ).subscribe(patch => this.formData$.next({ ...this.formData$.value, ...patch }));
  }

  updateField(field: LoginField, value: string) {
    this.touched.add(field);
    (this.fieldChanges[field] as Subject<string>).next(value);
  }

  markTouched(field: LoginField) {
    this.touched.add(field);
  }

  markAllTouched() {
    ;(['login','nickName','password'] as LoginField[]).forEach(f => this.touched.add(f));
  }

  reset() {
    this.formData$.next({ login: '', nickName: '', password: '' });
    this.touched.clear();
  }

  submit(): Observable<AuthApiResult> {
    return defer(() => combineLatest([this.allErrors$.pipe(take(1)), this.formData$.pipe(take(1))]))
      .pipe(
        switchMap(([errors, data]) => {
          const hasErrors = Object.values(errors).some(x => x.length > 0);
          if (hasErrors) return of({ message: 'Invalid form' } as unknown as AuthApiResult);
          this.isSubmitting$.next(true);
          return this.api.loginUser(data).pipe(finalize(() => this.isSubmitting$.next(false)));
        })
      );
  }

  private mkFieldErrors$(field: LoginField, src$: Subject<string>): Observable<string[]> {
    return src$.pipe(
      debounceTime(this.debounceMs),
      distinctUntilChanged(),
      startWith(''),
      switchMap(value => this.touched.has(field) ? of(V.validateField(field as any, value)) : of([])),
      shareReplay(1)
    );
  }

  getValue(): LoginContract { return this.formData$.value; }
}
