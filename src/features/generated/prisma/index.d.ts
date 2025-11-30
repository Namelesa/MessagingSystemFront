
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Message
 * 
 */
export type Message = $Result.DefaultSelection<Prisma.$MessagePayload>
/**
 * Model MessageKey
 * 
 */
export type MessageKey = $Result.DefaultSelection<Prisma.$MessageKeyPayload>
/**
 * Model RatchetState
 * 
 */
export type RatchetState = $Result.DefaultSelection<Prisma.$RatchetStatePayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.message`: Exposes CRUD operations for the **Message** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Messages
    * const messages = await prisma.message.findMany()
    * ```
    */
  get message(): Prisma.MessageDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.messageKey`: Exposes CRUD operations for the **MessageKey** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MessageKeys
    * const messageKeys = await prisma.messageKey.findMany()
    * ```
    */
  get messageKey(): Prisma.MessageKeyDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.ratchetState`: Exposes CRUD operations for the **RatchetState** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RatchetStates
    * const ratchetStates = await prisma.ratchetState.findMany()
    * ```
    */
  get ratchetState(): Prisma.RatchetStateDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.0
   * Query Engine version: 2ba551f319ab1df4bc874a89965d8b3641056773
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Message: 'Message',
    MessageKey: 'MessageKey',
    RatchetState: 'RatchetState'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "message" | "messageKey" | "ratchetState"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Message: {
        payload: Prisma.$MessagePayload<ExtArgs>
        fields: Prisma.MessageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MessageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MessageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          findFirst: {
            args: Prisma.MessageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MessageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          findMany: {
            args: Prisma.MessageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>[]
          }
          create: {
            args: Prisma.MessageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          createMany: {
            args: Prisma.MessageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MessageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>[]
          }
          delete: {
            args: Prisma.MessageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          update: {
            args: Prisma.MessageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          deleteMany: {
            args: Prisma.MessageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MessageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MessageUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>[]
          }
          upsert: {
            args: Prisma.MessageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          aggregate: {
            args: Prisma.MessageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMessage>
          }
          groupBy: {
            args: Prisma.MessageGroupByArgs<ExtArgs>
            result: $Utils.Optional<MessageGroupByOutputType>[]
          }
          count: {
            args: Prisma.MessageCountArgs<ExtArgs>
            result: $Utils.Optional<MessageCountAggregateOutputType> | number
          }
        }
      }
      MessageKey: {
        payload: Prisma.$MessageKeyPayload<ExtArgs>
        fields: Prisma.MessageKeyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MessageKeyFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MessageKeyFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload>
          }
          findFirst: {
            args: Prisma.MessageKeyFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MessageKeyFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload>
          }
          findMany: {
            args: Prisma.MessageKeyFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload>[]
          }
          create: {
            args: Prisma.MessageKeyCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload>
          }
          createMany: {
            args: Prisma.MessageKeyCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MessageKeyCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload>[]
          }
          delete: {
            args: Prisma.MessageKeyDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload>
          }
          update: {
            args: Prisma.MessageKeyUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload>
          }
          deleteMany: {
            args: Prisma.MessageKeyDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MessageKeyUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MessageKeyUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload>[]
          }
          upsert: {
            args: Prisma.MessageKeyUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageKeyPayload>
          }
          aggregate: {
            args: Prisma.MessageKeyAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMessageKey>
          }
          groupBy: {
            args: Prisma.MessageKeyGroupByArgs<ExtArgs>
            result: $Utils.Optional<MessageKeyGroupByOutputType>[]
          }
          count: {
            args: Prisma.MessageKeyCountArgs<ExtArgs>
            result: $Utils.Optional<MessageKeyCountAggregateOutputType> | number
          }
        }
      }
      RatchetState: {
        payload: Prisma.$RatchetStatePayload<ExtArgs>
        fields: Prisma.RatchetStateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RatchetStateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RatchetStateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload>
          }
          findFirst: {
            args: Prisma.RatchetStateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RatchetStateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload>
          }
          findMany: {
            args: Prisma.RatchetStateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload>[]
          }
          create: {
            args: Prisma.RatchetStateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload>
          }
          createMany: {
            args: Prisma.RatchetStateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RatchetStateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload>[]
          }
          delete: {
            args: Prisma.RatchetStateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload>
          }
          update: {
            args: Prisma.RatchetStateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload>
          }
          deleteMany: {
            args: Prisma.RatchetStateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RatchetStateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RatchetStateUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload>[]
          }
          upsert: {
            args: Prisma.RatchetStateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RatchetStatePayload>
          }
          aggregate: {
            args: Prisma.RatchetStateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRatchetState>
          }
          groupBy: {
            args: Prisma.RatchetStateGroupByArgs<ExtArgs>
            result: $Utils.Optional<RatchetStateGroupByOutputType>[]
          }
          count: {
            args: Prisma.RatchetStateCountArgs<ExtArgs>
            result: $Utils.Optional<RatchetStateCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    message?: MessageOmit
    messageKey?: MessageKeyOmit
    ratchetState?: RatchetStateOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    sentMessages: number
    receivedMessages: number
    messageKeys: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sentMessages?: boolean | UserCountOutputTypeCountSentMessagesArgs
    receivedMessages?: boolean | UserCountOutputTypeCountReceivedMessagesArgs
    messageKeys?: boolean | UserCountOutputTypeCountMessageKeysArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSentMessagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountReceivedMessagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountMessageKeysArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageKeyWhereInput
  }


  /**
   * Count Type MessageCountOutputType
   */

  export type MessageCountOutputType = {
    messageKeys: number
    replies: number
  }

  export type MessageCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    messageKeys?: boolean | MessageCountOutputTypeCountMessageKeysArgs
    replies?: boolean | MessageCountOutputTypeCountRepliesArgs
  }

  // Custom InputTypes
  /**
   * MessageCountOutputType without action
   */
  export type MessageCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageCountOutputType
     */
    select?: MessageCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * MessageCountOutputType without action
   */
  export type MessageCountOutputTypeCountMessageKeysArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageKeyWhereInput
  }

  /**
   * MessageCountOutputType without action
   */
  export type MessageCountOutputTypeCountRepliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    nickName: string | null
    key: string | null
    createdAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    nickName: string | null
    key: string | null
    createdAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    nickName: number
    key: number
    createdAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    nickName?: true
    key?: true
    createdAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    nickName?: true
    key?: true
    createdAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    nickName?: true
    key?: true
    createdAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    nickName: string
    key: string
    createdAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nickName?: boolean
    key?: boolean
    createdAt?: boolean
    sentMessages?: boolean | User$sentMessagesArgs<ExtArgs>
    receivedMessages?: boolean | User$receivedMessagesArgs<ExtArgs>
    messageKeys?: boolean | User$messageKeysArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nickName?: boolean
    key?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nickName?: boolean
    key?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    nickName?: boolean
    key?: boolean
    createdAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nickName" | "key" | "createdAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sentMessages?: boolean | User$sentMessagesArgs<ExtArgs>
    receivedMessages?: boolean | User$receivedMessagesArgs<ExtArgs>
    messageKeys?: boolean | User$messageKeysArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      sentMessages: Prisma.$MessagePayload<ExtArgs>[]
      receivedMessages: Prisma.$MessagePayload<ExtArgs>[]
      messageKeys: Prisma.$MessageKeyPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      nickName: string
      key: string
      createdAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    sentMessages<T extends User$sentMessagesArgs<ExtArgs> = {}>(args?: Subset<T, User$sentMessagesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    receivedMessages<T extends User$receivedMessagesArgs<ExtArgs> = {}>(args?: Subset<T, User$receivedMessagesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    messageKeys<T extends User$messageKeysArgs<ExtArgs> = {}>(args?: Subset<T, User$messageKeysArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly nickName: FieldRef<"User", 'String'>
    readonly key: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.sentMessages
   */
  export type User$sentMessagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    where?: MessageWhereInput
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    cursor?: MessageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }

  /**
   * User.receivedMessages
   */
  export type User$receivedMessagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    where?: MessageWhereInput
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    cursor?: MessageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }

  /**
   * User.messageKeys
   */
  export type User$messageKeysArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    where?: MessageKeyWhereInput
    orderBy?: MessageKeyOrderByWithRelationInput | MessageKeyOrderByWithRelationInput[]
    cursor?: MessageKeyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageKeyScalarFieldEnum | MessageKeyScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Message
   */

  export type AggregateMessage = {
    _count: MessageCountAggregateOutputType | null
    _avg: MessageAvgAggregateOutputType | null
    _sum: MessageSumAggregateOutputType | null
    _min: MessageMinAggregateOutputType | null
    _max: MessageMaxAggregateOutputType | null
  }

  export type MessageAvgAggregateOutputType = {
    messageNumber: number | null
    previousChainN: number | null
  }

  export type MessageSumAggregateOutputType = {
    messageNumber: number | null
    previousChainN: number | null
  }

  export type MessageMinAggregateOutputType = {
    id: string | null
    senderId: string | null
    recipientId: string | null
    encryptedContent: string | null
    ephemeralKey: string | null
    nonce: string | null
    messageNumber: number | null
    previousChainN: number | null
    timestamp: Date | null
    isEdited: boolean | null
    editedAt: Date | null
    deleteType: string | null
    deletedAt: Date | null
    replyToId: string | null
  }

  export type MessageMaxAggregateOutputType = {
    id: string | null
    senderId: string | null
    recipientId: string | null
    encryptedContent: string | null
    ephemeralKey: string | null
    nonce: string | null
    messageNumber: number | null
    previousChainN: number | null
    timestamp: Date | null
    isEdited: boolean | null
    editedAt: Date | null
    deleteType: string | null
    deletedAt: Date | null
    replyToId: string | null
  }

  export type MessageCountAggregateOutputType = {
    id: number
    senderId: number
    recipientId: number
    encryptedContent: number
    ephemeralKey: number
    nonce: number
    messageNumber: number
    previousChainN: number
    timestamp: number
    isEdited: number
    editedAt: number
    deleteType: number
    deletedAt: number
    replyToId: number
    _all: number
  }


  export type MessageAvgAggregateInputType = {
    messageNumber?: true
    previousChainN?: true
  }

  export type MessageSumAggregateInputType = {
    messageNumber?: true
    previousChainN?: true
  }

  export type MessageMinAggregateInputType = {
    id?: true
    senderId?: true
    recipientId?: true
    encryptedContent?: true
    ephemeralKey?: true
    nonce?: true
    messageNumber?: true
    previousChainN?: true
    timestamp?: true
    isEdited?: true
    editedAt?: true
    deleteType?: true
    deletedAt?: true
    replyToId?: true
  }

  export type MessageMaxAggregateInputType = {
    id?: true
    senderId?: true
    recipientId?: true
    encryptedContent?: true
    ephemeralKey?: true
    nonce?: true
    messageNumber?: true
    previousChainN?: true
    timestamp?: true
    isEdited?: true
    editedAt?: true
    deleteType?: true
    deletedAt?: true
    replyToId?: true
  }

  export type MessageCountAggregateInputType = {
    id?: true
    senderId?: true
    recipientId?: true
    encryptedContent?: true
    ephemeralKey?: true
    nonce?: true
    messageNumber?: true
    previousChainN?: true
    timestamp?: true
    isEdited?: true
    editedAt?: true
    deleteType?: true
    deletedAt?: true
    replyToId?: true
    _all?: true
  }

  export type MessageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Message to aggregate.
     */
    where?: MessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Messages to fetch.
     */
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Messages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Messages
    **/
    _count?: true | MessageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MessageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MessageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MessageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MessageMaxAggregateInputType
  }

  export type GetMessageAggregateType<T extends MessageAggregateArgs> = {
        [P in keyof T & keyof AggregateMessage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMessage[P]>
      : GetScalarType<T[P], AggregateMessage[P]>
  }




  export type MessageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageWhereInput
    orderBy?: MessageOrderByWithAggregationInput | MessageOrderByWithAggregationInput[]
    by: MessageScalarFieldEnum[] | MessageScalarFieldEnum
    having?: MessageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MessageCountAggregateInputType | true
    _avg?: MessageAvgAggregateInputType
    _sum?: MessageSumAggregateInputType
    _min?: MessageMinAggregateInputType
    _max?: MessageMaxAggregateInputType
  }

  export type MessageGroupByOutputType = {
    id: string
    senderId: string
    recipientId: string
    encryptedContent: string
    ephemeralKey: string | null
    nonce: string | null
    messageNumber: number | null
    previousChainN: number | null
    timestamp: Date
    isEdited: boolean
    editedAt: Date | null
    deleteType: string | null
    deletedAt: Date | null
    replyToId: string | null
    _count: MessageCountAggregateOutputType | null
    _avg: MessageAvgAggregateOutputType | null
    _sum: MessageSumAggregateOutputType | null
    _min: MessageMinAggregateOutputType | null
    _max: MessageMaxAggregateOutputType | null
  }

  type GetMessageGroupByPayload<T extends MessageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MessageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MessageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MessageGroupByOutputType[P]>
            : GetScalarType<T[P], MessageGroupByOutputType[P]>
        }
      >
    >


  export type MessageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    senderId?: boolean
    recipientId?: boolean
    encryptedContent?: boolean
    ephemeralKey?: boolean
    nonce?: boolean
    messageNumber?: boolean
    previousChainN?: boolean
    timestamp?: boolean
    isEdited?: boolean
    editedAt?: boolean
    deleteType?: boolean
    deletedAt?: boolean
    replyToId?: boolean
    sender?: boolean | UserDefaultArgs<ExtArgs>
    recipient?: boolean | UserDefaultArgs<ExtArgs>
    messageKeys?: boolean | Message$messageKeysArgs<ExtArgs>
    replyTo?: boolean | Message$replyToArgs<ExtArgs>
    replies?: boolean | Message$repliesArgs<ExtArgs>
    _count?: boolean | MessageCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["message"]>

  export type MessageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    senderId?: boolean
    recipientId?: boolean
    encryptedContent?: boolean
    ephemeralKey?: boolean
    nonce?: boolean
    messageNumber?: boolean
    previousChainN?: boolean
    timestamp?: boolean
    isEdited?: boolean
    editedAt?: boolean
    deleteType?: boolean
    deletedAt?: boolean
    replyToId?: boolean
    sender?: boolean | UserDefaultArgs<ExtArgs>
    recipient?: boolean | UserDefaultArgs<ExtArgs>
    replyTo?: boolean | Message$replyToArgs<ExtArgs>
  }, ExtArgs["result"]["message"]>

  export type MessageSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    senderId?: boolean
    recipientId?: boolean
    encryptedContent?: boolean
    ephemeralKey?: boolean
    nonce?: boolean
    messageNumber?: boolean
    previousChainN?: boolean
    timestamp?: boolean
    isEdited?: boolean
    editedAt?: boolean
    deleteType?: boolean
    deletedAt?: boolean
    replyToId?: boolean
    sender?: boolean | UserDefaultArgs<ExtArgs>
    recipient?: boolean | UserDefaultArgs<ExtArgs>
    replyTo?: boolean | Message$replyToArgs<ExtArgs>
  }, ExtArgs["result"]["message"]>

  export type MessageSelectScalar = {
    id?: boolean
    senderId?: boolean
    recipientId?: boolean
    encryptedContent?: boolean
    ephemeralKey?: boolean
    nonce?: boolean
    messageNumber?: boolean
    previousChainN?: boolean
    timestamp?: boolean
    isEdited?: boolean
    editedAt?: boolean
    deleteType?: boolean
    deletedAt?: boolean
    replyToId?: boolean
  }

  export type MessageOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "senderId" | "recipientId" | "encryptedContent" | "ephemeralKey" | "nonce" | "messageNumber" | "previousChainN" | "timestamp" | "isEdited" | "editedAt" | "deleteType" | "deletedAt" | "replyToId", ExtArgs["result"]["message"]>
  export type MessageInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sender?: boolean | UserDefaultArgs<ExtArgs>
    recipient?: boolean | UserDefaultArgs<ExtArgs>
    messageKeys?: boolean | Message$messageKeysArgs<ExtArgs>
    replyTo?: boolean | Message$replyToArgs<ExtArgs>
    replies?: boolean | Message$repliesArgs<ExtArgs>
    _count?: boolean | MessageCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type MessageIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sender?: boolean | UserDefaultArgs<ExtArgs>
    recipient?: boolean | UserDefaultArgs<ExtArgs>
    replyTo?: boolean | Message$replyToArgs<ExtArgs>
  }
  export type MessageIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sender?: boolean | UserDefaultArgs<ExtArgs>
    recipient?: boolean | UserDefaultArgs<ExtArgs>
    replyTo?: boolean | Message$replyToArgs<ExtArgs>
  }

  export type $MessagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Message"
    objects: {
      sender: Prisma.$UserPayload<ExtArgs>
      recipient: Prisma.$UserPayload<ExtArgs>
      messageKeys: Prisma.$MessageKeyPayload<ExtArgs>[]
      replyTo: Prisma.$MessagePayload<ExtArgs> | null
      replies: Prisma.$MessagePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      senderId: string
      recipientId: string
      encryptedContent: string
      ephemeralKey: string | null
      nonce: string | null
      messageNumber: number | null
      previousChainN: number | null
      timestamp: Date
      isEdited: boolean
      editedAt: Date | null
      deleteType: string | null
      deletedAt: Date | null
      replyToId: string | null
    }, ExtArgs["result"]["message"]>
    composites: {}
  }

  type MessageGetPayload<S extends boolean | null | undefined | MessageDefaultArgs> = $Result.GetResult<Prisma.$MessagePayload, S>

  type MessageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MessageFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MessageCountAggregateInputType | true
    }

  export interface MessageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Message'], meta: { name: 'Message' } }
    /**
     * Find zero or one Message that matches the filter.
     * @param {MessageFindUniqueArgs} args - Arguments to find a Message
     * @example
     * // Get one Message
     * const message = await prisma.message.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MessageFindUniqueArgs>(args: SelectSubset<T, MessageFindUniqueArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Message that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MessageFindUniqueOrThrowArgs} args - Arguments to find a Message
     * @example
     * // Get one Message
     * const message = await prisma.message.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MessageFindUniqueOrThrowArgs>(args: SelectSubset<T, MessageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Message that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageFindFirstArgs} args - Arguments to find a Message
     * @example
     * // Get one Message
     * const message = await prisma.message.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MessageFindFirstArgs>(args?: SelectSubset<T, MessageFindFirstArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Message that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageFindFirstOrThrowArgs} args - Arguments to find a Message
     * @example
     * // Get one Message
     * const message = await prisma.message.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MessageFindFirstOrThrowArgs>(args?: SelectSubset<T, MessageFindFirstOrThrowArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Messages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Messages
     * const messages = await prisma.message.findMany()
     * 
     * // Get first 10 Messages
     * const messages = await prisma.message.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const messageWithIdOnly = await prisma.message.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MessageFindManyArgs>(args?: SelectSubset<T, MessageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Message.
     * @param {MessageCreateArgs} args - Arguments to create a Message.
     * @example
     * // Create one Message
     * const Message = await prisma.message.create({
     *   data: {
     *     // ... data to create a Message
     *   }
     * })
     * 
     */
    create<T extends MessageCreateArgs>(args: SelectSubset<T, MessageCreateArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Messages.
     * @param {MessageCreateManyArgs} args - Arguments to create many Messages.
     * @example
     * // Create many Messages
     * const message = await prisma.message.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MessageCreateManyArgs>(args?: SelectSubset<T, MessageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Messages and returns the data saved in the database.
     * @param {MessageCreateManyAndReturnArgs} args - Arguments to create many Messages.
     * @example
     * // Create many Messages
     * const message = await prisma.message.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Messages and only return the `id`
     * const messageWithIdOnly = await prisma.message.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MessageCreateManyAndReturnArgs>(args?: SelectSubset<T, MessageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Message.
     * @param {MessageDeleteArgs} args - Arguments to delete one Message.
     * @example
     * // Delete one Message
     * const Message = await prisma.message.delete({
     *   where: {
     *     // ... filter to delete one Message
     *   }
     * })
     * 
     */
    delete<T extends MessageDeleteArgs>(args: SelectSubset<T, MessageDeleteArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Message.
     * @param {MessageUpdateArgs} args - Arguments to update one Message.
     * @example
     * // Update one Message
     * const message = await prisma.message.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MessageUpdateArgs>(args: SelectSubset<T, MessageUpdateArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Messages.
     * @param {MessageDeleteManyArgs} args - Arguments to filter Messages to delete.
     * @example
     * // Delete a few Messages
     * const { count } = await prisma.message.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MessageDeleteManyArgs>(args?: SelectSubset<T, MessageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Messages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Messages
     * const message = await prisma.message.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MessageUpdateManyArgs>(args: SelectSubset<T, MessageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Messages and returns the data updated in the database.
     * @param {MessageUpdateManyAndReturnArgs} args - Arguments to update many Messages.
     * @example
     * // Update many Messages
     * const message = await prisma.message.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Messages and only return the `id`
     * const messageWithIdOnly = await prisma.message.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MessageUpdateManyAndReturnArgs>(args: SelectSubset<T, MessageUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Message.
     * @param {MessageUpsertArgs} args - Arguments to update or create a Message.
     * @example
     * // Update or create a Message
     * const message = await prisma.message.upsert({
     *   create: {
     *     // ... data to create a Message
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Message we want to update
     *   }
     * })
     */
    upsert<T extends MessageUpsertArgs>(args: SelectSubset<T, MessageUpsertArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Messages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageCountArgs} args - Arguments to filter Messages to count.
     * @example
     * // Count the number of Messages
     * const count = await prisma.message.count({
     *   where: {
     *     // ... the filter for the Messages we want to count
     *   }
     * })
    **/
    count<T extends MessageCountArgs>(
      args?: Subset<T, MessageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MessageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Message.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MessageAggregateArgs>(args: Subset<T, MessageAggregateArgs>): Prisma.PrismaPromise<GetMessageAggregateType<T>>

    /**
     * Group by Message.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MessageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MessageGroupByArgs['orderBy'] }
        : { orderBy?: MessageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MessageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMessageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Message model
   */
  readonly fields: MessageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Message.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MessageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    sender<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    recipient<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    messageKeys<T extends Message$messageKeysArgs<ExtArgs> = {}>(args?: Subset<T, Message$messageKeysArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    replyTo<T extends Message$replyToArgs<ExtArgs> = {}>(args?: Subset<T, Message$replyToArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    replies<T extends Message$repliesArgs<ExtArgs> = {}>(args?: Subset<T, Message$repliesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Message model
   */
  interface MessageFieldRefs {
    readonly id: FieldRef<"Message", 'String'>
    readonly senderId: FieldRef<"Message", 'String'>
    readonly recipientId: FieldRef<"Message", 'String'>
    readonly encryptedContent: FieldRef<"Message", 'String'>
    readonly ephemeralKey: FieldRef<"Message", 'String'>
    readonly nonce: FieldRef<"Message", 'String'>
    readonly messageNumber: FieldRef<"Message", 'Int'>
    readonly previousChainN: FieldRef<"Message", 'Int'>
    readonly timestamp: FieldRef<"Message", 'DateTime'>
    readonly isEdited: FieldRef<"Message", 'Boolean'>
    readonly editedAt: FieldRef<"Message", 'DateTime'>
    readonly deleteType: FieldRef<"Message", 'String'>
    readonly deletedAt: FieldRef<"Message", 'DateTime'>
    readonly replyToId: FieldRef<"Message", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Message findUnique
   */
  export type MessageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Message to fetch.
     */
    where: MessageWhereUniqueInput
  }

  /**
   * Message findUniqueOrThrow
   */
  export type MessageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Message to fetch.
     */
    where: MessageWhereUniqueInput
  }

  /**
   * Message findFirst
   */
  export type MessageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Message to fetch.
     */
    where?: MessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Messages to fetch.
     */
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Messages.
     */
    cursor?: MessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Messages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Messages.
     */
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }

  /**
   * Message findFirstOrThrow
   */
  export type MessageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Message to fetch.
     */
    where?: MessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Messages to fetch.
     */
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Messages.
     */
    cursor?: MessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Messages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Messages.
     */
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }

  /**
   * Message findMany
   */
  export type MessageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Messages to fetch.
     */
    where?: MessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Messages to fetch.
     */
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Messages.
     */
    cursor?: MessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Messages.
     */
    skip?: number
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }

  /**
   * Message create
   */
  export type MessageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * The data needed to create a Message.
     */
    data: XOR<MessageCreateInput, MessageUncheckedCreateInput>
  }

  /**
   * Message createMany
   */
  export type MessageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Messages.
     */
    data: MessageCreateManyInput | MessageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Message createManyAndReturn
   */
  export type MessageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * The data used to create many Messages.
     */
    data: MessageCreateManyInput | MessageCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Message update
   */
  export type MessageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * The data needed to update a Message.
     */
    data: XOR<MessageUpdateInput, MessageUncheckedUpdateInput>
    /**
     * Choose, which Message to update.
     */
    where: MessageWhereUniqueInput
  }

  /**
   * Message updateMany
   */
  export type MessageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Messages.
     */
    data: XOR<MessageUpdateManyMutationInput, MessageUncheckedUpdateManyInput>
    /**
     * Filter which Messages to update
     */
    where?: MessageWhereInput
    /**
     * Limit how many Messages to update.
     */
    limit?: number
  }

  /**
   * Message updateManyAndReturn
   */
  export type MessageUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * The data used to update Messages.
     */
    data: XOR<MessageUpdateManyMutationInput, MessageUncheckedUpdateManyInput>
    /**
     * Filter which Messages to update
     */
    where?: MessageWhereInput
    /**
     * Limit how many Messages to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Message upsert
   */
  export type MessageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * The filter to search for the Message to update in case it exists.
     */
    where: MessageWhereUniqueInput
    /**
     * In case the Message found by the `where` argument doesn't exist, create a new Message with this data.
     */
    create: XOR<MessageCreateInput, MessageUncheckedCreateInput>
    /**
     * In case the Message was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MessageUpdateInput, MessageUncheckedUpdateInput>
  }

  /**
   * Message delete
   */
  export type MessageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter which Message to delete.
     */
    where: MessageWhereUniqueInput
  }

  /**
   * Message deleteMany
   */
  export type MessageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Messages to delete
     */
    where?: MessageWhereInput
    /**
     * Limit how many Messages to delete.
     */
    limit?: number
  }

  /**
   * Message.messageKeys
   */
  export type Message$messageKeysArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    where?: MessageKeyWhereInput
    orderBy?: MessageKeyOrderByWithRelationInput | MessageKeyOrderByWithRelationInput[]
    cursor?: MessageKeyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageKeyScalarFieldEnum | MessageKeyScalarFieldEnum[]
  }

  /**
   * Message.replyTo
   */
  export type Message$replyToArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    where?: MessageWhereInput
  }

  /**
   * Message.replies
   */
  export type Message$repliesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
    where?: MessageWhereInput
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    cursor?: MessageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }

  /**
   * Message without action
   */
  export type MessageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Message
     */
    omit?: MessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageInclude<ExtArgs> | null
  }


  /**
   * Model MessageKey
   */

  export type AggregateMessageKey = {
    _count: MessageKeyCountAggregateOutputType | null
    _avg: MessageKeyAvgAggregateOutputType | null
    _sum: MessageKeySumAggregateOutputType | null
    _min: MessageKeyMinAggregateOutputType | null
    _max: MessageKeyMaxAggregateOutputType | null
  }

  export type MessageKeyAvgAggregateOutputType = {
    keyIndex: number | null
  }

  export type MessageKeySumAggregateOutputType = {
    keyIndex: number | null
  }

  export type MessageKeyMinAggregateOutputType = {
    id: string | null
    messageId: string | null
    userId: string | null
    encryptedKey: string | null
    ephemeralPublicKey: string | null
    chainKeySnapshot: string | null
    keyIndex: number | null
    createdAt: Date | null
  }

  export type MessageKeyMaxAggregateOutputType = {
    id: string | null
    messageId: string | null
    userId: string | null
    encryptedKey: string | null
    ephemeralPublicKey: string | null
    chainKeySnapshot: string | null
    keyIndex: number | null
    createdAt: Date | null
  }

  export type MessageKeyCountAggregateOutputType = {
    id: number
    messageId: number
    userId: number
    encryptedKey: number
    ephemeralPublicKey: number
    chainKeySnapshot: number
    keyIndex: number
    createdAt: number
    _all: number
  }


  export type MessageKeyAvgAggregateInputType = {
    keyIndex?: true
  }

  export type MessageKeySumAggregateInputType = {
    keyIndex?: true
  }

  export type MessageKeyMinAggregateInputType = {
    id?: true
    messageId?: true
    userId?: true
    encryptedKey?: true
    ephemeralPublicKey?: true
    chainKeySnapshot?: true
    keyIndex?: true
    createdAt?: true
  }

  export type MessageKeyMaxAggregateInputType = {
    id?: true
    messageId?: true
    userId?: true
    encryptedKey?: true
    ephemeralPublicKey?: true
    chainKeySnapshot?: true
    keyIndex?: true
    createdAt?: true
  }

  export type MessageKeyCountAggregateInputType = {
    id?: true
    messageId?: true
    userId?: true
    encryptedKey?: true
    ephemeralPublicKey?: true
    chainKeySnapshot?: true
    keyIndex?: true
    createdAt?: true
    _all?: true
  }

  export type MessageKeyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MessageKey to aggregate.
     */
    where?: MessageKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageKeys to fetch.
     */
    orderBy?: MessageKeyOrderByWithRelationInput | MessageKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MessageKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageKeys.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MessageKeys
    **/
    _count?: true | MessageKeyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MessageKeyAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MessageKeySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MessageKeyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MessageKeyMaxAggregateInputType
  }

  export type GetMessageKeyAggregateType<T extends MessageKeyAggregateArgs> = {
        [P in keyof T & keyof AggregateMessageKey]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMessageKey[P]>
      : GetScalarType<T[P], AggregateMessageKey[P]>
  }




  export type MessageKeyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageKeyWhereInput
    orderBy?: MessageKeyOrderByWithAggregationInput | MessageKeyOrderByWithAggregationInput[]
    by: MessageKeyScalarFieldEnum[] | MessageKeyScalarFieldEnum
    having?: MessageKeyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MessageKeyCountAggregateInputType | true
    _avg?: MessageKeyAvgAggregateInputType
    _sum?: MessageKeySumAggregateInputType
    _min?: MessageKeyMinAggregateInputType
    _max?: MessageKeyMaxAggregateInputType
  }

  export type MessageKeyGroupByOutputType = {
    id: string
    messageId: string
    userId: string
    encryptedKey: string
    ephemeralPublicKey: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt: Date
    _count: MessageKeyCountAggregateOutputType | null
    _avg: MessageKeyAvgAggregateOutputType | null
    _sum: MessageKeySumAggregateOutputType | null
    _min: MessageKeyMinAggregateOutputType | null
    _max: MessageKeyMaxAggregateOutputType | null
  }

  type GetMessageKeyGroupByPayload<T extends MessageKeyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MessageKeyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MessageKeyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MessageKeyGroupByOutputType[P]>
            : GetScalarType<T[P], MessageKeyGroupByOutputType[P]>
        }
      >
    >


  export type MessageKeySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    messageId?: boolean
    userId?: boolean
    encryptedKey?: boolean
    ephemeralPublicKey?: boolean
    chainKeySnapshot?: boolean
    keyIndex?: boolean
    createdAt?: boolean
    message?: boolean | MessageDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["messageKey"]>

  export type MessageKeySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    messageId?: boolean
    userId?: boolean
    encryptedKey?: boolean
    ephemeralPublicKey?: boolean
    chainKeySnapshot?: boolean
    keyIndex?: boolean
    createdAt?: boolean
    message?: boolean | MessageDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["messageKey"]>

  export type MessageKeySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    messageId?: boolean
    userId?: boolean
    encryptedKey?: boolean
    ephemeralPublicKey?: boolean
    chainKeySnapshot?: boolean
    keyIndex?: boolean
    createdAt?: boolean
    message?: boolean | MessageDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["messageKey"]>

  export type MessageKeySelectScalar = {
    id?: boolean
    messageId?: boolean
    userId?: boolean
    encryptedKey?: boolean
    ephemeralPublicKey?: boolean
    chainKeySnapshot?: boolean
    keyIndex?: boolean
    createdAt?: boolean
  }

  export type MessageKeyOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "messageId" | "userId" | "encryptedKey" | "ephemeralPublicKey" | "chainKeySnapshot" | "keyIndex" | "createdAt", ExtArgs["result"]["messageKey"]>
  export type MessageKeyInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    message?: boolean | MessageDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type MessageKeyIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    message?: boolean | MessageDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type MessageKeyIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    message?: boolean | MessageDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $MessageKeyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MessageKey"
    objects: {
      message: Prisma.$MessagePayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      messageId: string
      userId: string
      encryptedKey: string
      ephemeralPublicKey: string | null
      chainKeySnapshot: string
      keyIndex: number
      createdAt: Date
    }, ExtArgs["result"]["messageKey"]>
    composites: {}
  }

  type MessageKeyGetPayload<S extends boolean | null | undefined | MessageKeyDefaultArgs> = $Result.GetResult<Prisma.$MessageKeyPayload, S>

  type MessageKeyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MessageKeyFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MessageKeyCountAggregateInputType | true
    }

  export interface MessageKeyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MessageKey'], meta: { name: 'MessageKey' } }
    /**
     * Find zero or one MessageKey that matches the filter.
     * @param {MessageKeyFindUniqueArgs} args - Arguments to find a MessageKey
     * @example
     * // Get one MessageKey
     * const messageKey = await prisma.messageKey.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MessageKeyFindUniqueArgs>(args: SelectSubset<T, MessageKeyFindUniqueArgs<ExtArgs>>): Prisma__MessageKeyClient<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MessageKey that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MessageKeyFindUniqueOrThrowArgs} args - Arguments to find a MessageKey
     * @example
     * // Get one MessageKey
     * const messageKey = await prisma.messageKey.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MessageKeyFindUniqueOrThrowArgs>(args: SelectSubset<T, MessageKeyFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MessageKeyClient<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MessageKey that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageKeyFindFirstArgs} args - Arguments to find a MessageKey
     * @example
     * // Get one MessageKey
     * const messageKey = await prisma.messageKey.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MessageKeyFindFirstArgs>(args?: SelectSubset<T, MessageKeyFindFirstArgs<ExtArgs>>): Prisma__MessageKeyClient<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MessageKey that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageKeyFindFirstOrThrowArgs} args - Arguments to find a MessageKey
     * @example
     * // Get one MessageKey
     * const messageKey = await prisma.messageKey.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MessageKeyFindFirstOrThrowArgs>(args?: SelectSubset<T, MessageKeyFindFirstOrThrowArgs<ExtArgs>>): Prisma__MessageKeyClient<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MessageKeys that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageKeyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MessageKeys
     * const messageKeys = await prisma.messageKey.findMany()
     * 
     * // Get first 10 MessageKeys
     * const messageKeys = await prisma.messageKey.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const messageKeyWithIdOnly = await prisma.messageKey.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MessageKeyFindManyArgs>(args?: SelectSubset<T, MessageKeyFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MessageKey.
     * @param {MessageKeyCreateArgs} args - Arguments to create a MessageKey.
     * @example
     * // Create one MessageKey
     * const MessageKey = await prisma.messageKey.create({
     *   data: {
     *     // ... data to create a MessageKey
     *   }
     * })
     * 
     */
    create<T extends MessageKeyCreateArgs>(args: SelectSubset<T, MessageKeyCreateArgs<ExtArgs>>): Prisma__MessageKeyClient<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MessageKeys.
     * @param {MessageKeyCreateManyArgs} args - Arguments to create many MessageKeys.
     * @example
     * // Create many MessageKeys
     * const messageKey = await prisma.messageKey.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MessageKeyCreateManyArgs>(args?: SelectSubset<T, MessageKeyCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MessageKeys and returns the data saved in the database.
     * @param {MessageKeyCreateManyAndReturnArgs} args - Arguments to create many MessageKeys.
     * @example
     * // Create many MessageKeys
     * const messageKey = await prisma.messageKey.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MessageKeys and only return the `id`
     * const messageKeyWithIdOnly = await prisma.messageKey.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MessageKeyCreateManyAndReturnArgs>(args?: SelectSubset<T, MessageKeyCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a MessageKey.
     * @param {MessageKeyDeleteArgs} args - Arguments to delete one MessageKey.
     * @example
     * // Delete one MessageKey
     * const MessageKey = await prisma.messageKey.delete({
     *   where: {
     *     // ... filter to delete one MessageKey
     *   }
     * })
     * 
     */
    delete<T extends MessageKeyDeleteArgs>(args: SelectSubset<T, MessageKeyDeleteArgs<ExtArgs>>): Prisma__MessageKeyClient<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MessageKey.
     * @param {MessageKeyUpdateArgs} args - Arguments to update one MessageKey.
     * @example
     * // Update one MessageKey
     * const messageKey = await prisma.messageKey.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MessageKeyUpdateArgs>(args: SelectSubset<T, MessageKeyUpdateArgs<ExtArgs>>): Prisma__MessageKeyClient<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MessageKeys.
     * @param {MessageKeyDeleteManyArgs} args - Arguments to filter MessageKeys to delete.
     * @example
     * // Delete a few MessageKeys
     * const { count } = await prisma.messageKey.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MessageKeyDeleteManyArgs>(args?: SelectSubset<T, MessageKeyDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MessageKeys.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageKeyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MessageKeys
     * const messageKey = await prisma.messageKey.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MessageKeyUpdateManyArgs>(args: SelectSubset<T, MessageKeyUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MessageKeys and returns the data updated in the database.
     * @param {MessageKeyUpdateManyAndReturnArgs} args - Arguments to update many MessageKeys.
     * @example
     * // Update many MessageKeys
     * const messageKey = await prisma.messageKey.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more MessageKeys and only return the `id`
     * const messageKeyWithIdOnly = await prisma.messageKey.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MessageKeyUpdateManyAndReturnArgs>(args: SelectSubset<T, MessageKeyUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one MessageKey.
     * @param {MessageKeyUpsertArgs} args - Arguments to update or create a MessageKey.
     * @example
     * // Update or create a MessageKey
     * const messageKey = await prisma.messageKey.upsert({
     *   create: {
     *     // ... data to create a MessageKey
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MessageKey we want to update
     *   }
     * })
     */
    upsert<T extends MessageKeyUpsertArgs>(args: SelectSubset<T, MessageKeyUpsertArgs<ExtArgs>>): Prisma__MessageKeyClient<$Result.GetResult<Prisma.$MessageKeyPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MessageKeys.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageKeyCountArgs} args - Arguments to filter MessageKeys to count.
     * @example
     * // Count the number of MessageKeys
     * const count = await prisma.messageKey.count({
     *   where: {
     *     // ... the filter for the MessageKeys we want to count
     *   }
     * })
    **/
    count<T extends MessageKeyCountArgs>(
      args?: Subset<T, MessageKeyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MessageKeyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MessageKey.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageKeyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MessageKeyAggregateArgs>(args: Subset<T, MessageKeyAggregateArgs>): Prisma.PrismaPromise<GetMessageKeyAggregateType<T>>

    /**
     * Group by MessageKey.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageKeyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MessageKeyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MessageKeyGroupByArgs['orderBy'] }
        : { orderBy?: MessageKeyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MessageKeyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMessageKeyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MessageKey model
   */
  readonly fields: MessageKeyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MessageKey.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MessageKeyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    message<T extends MessageDefaultArgs<ExtArgs> = {}>(args?: Subset<T, MessageDefaultArgs<ExtArgs>>): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MessageKey model
   */
  interface MessageKeyFieldRefs {
    readonly id: FieldRef<"MessageKey", 'String'>
    readonly messageId: FieldRef<"MessageKey", 'String'>
    readonly userId: FieldRef<"MessageKey", 'String'>
    readonly encryptedKey: FieldRef<"MessageKey", 'String'>
    readonly ephemeralPublicKey: FieldRef<"MessageKey", 'String'>
    readonly chainKeySnapshot: FieldRef<"MessageKey", 'String'>
    readonly keyIndex: FieldRef<"MessageKey", 'Int'>
    readonly createdAt: FieldRef<"MessageKey", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MessageKey findUnique
   */
  export type MessageKeyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    /**
     * Filter, which MessageKey to fetch.
     */
    where: MessageKeyWhereUniqueInput
  }

  /**
   * MessageKey findUniqueOrThrow
   */
  export type MessageKeyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    /**
     * Filter, which MessageKey to fetch.
     */
    where: MessageKeyWhereUniqueInput
  }

  /**
   * MessageKey findFirst
   */
  export type MessageKeyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    /**
     * Filter, which MessageKey to fetch.
     */
    where?: MessageKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageKeys to fetch.
     */
    orderBy?: MessageKeyOrderByWithRelationInput | MessageKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MessageKeys.
     */
    cursor?: MessageKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageKeys.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MessageKeys.
     */
    distinct?: MessageKeyScalarFieldEnum | MessageKeyScalarFieldEnum[]
  }

  /**
   * MessageKey findFirstOrThrow
   */
  export type MessageKeyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    /**
     * Filter, which MessageKey to fetch.
     */
    where?: MessageKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageKeys to fetch.
     */
    orderBy?: MessageKeyOrderByWithRelationInput | MessageKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MessageKeys.
     */
    cursor?: MessageKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageKeys.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MessageKeys.
     */
    distinct?: MessageKeyScalarFieldEnum | MessageKeyScalarFieldEnum[]
  }

  /**
   * MessageKey findMany
   */
  export type MessageKeyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    /**
     * Filter, which MessageKeys to fetch.
     */
    where?: MessageKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageKeys to fetch.
     */
    orderBy?: MessageKeyOrderByWithRelationInput | MessageKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MessageKeys.
     */
    cursor?: MessageKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageKeys.
     */
    skip?: number
    distinct?: MessageKeyScalarFieldEnum | MessageKeyScalarFieldEnum[]
  }

  /**
   * MessageKey create
   */
  export type MessageKeyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    /**
     * The data needed to create a MessageKey.
     */
    data: XOR<MessageKeyCreateInput, MessageKeyUncheckedCreateInput>
  }

  /**
   * MessageKey createMany
   */
  export type MessageKeyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MessageKeys.
     */
    data: MessageKeyCreateManyInput | MessageKeyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MessageKey createManyAndReturn
   */
  export type MessageKeyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * The data used to create many MessageKeys.
     */
    data: MessageKeyCreateManyInput | MessageKeyCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * MessageKey update
   */
  export type MessageKeyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    /**
     * The data needed to update a MessageKey.
     */
    data: XOR<MessageKeyUpdateInput, MessageKeyUncheckedUpdateInput>
    /**
     * Choose, which MessageKey to update.
     */
    where: MessageKeyWhereUniqueInput
  }

  /**
   * MessageKey updateMany
   */
  export type MessageKeyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MessageKeys.
     */
    data: XOR<MessageKeyUpdateManyMutationInput, MessageKeyUncheckedUpdateManyInput>
    /**
     * Filter which MessageKeys to update
     */
    where?: MessageKeyWhereInput
    /**
     * Limit how many MessageKeys to update.
     */
    limit?: number
  }

  /**
   * MessageKey updateManyAndReturn
   */
  export type MessageKeyUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * The data used to update MessageKeys.
     */
    data: XOR<MessageKeyUpdateManyMutationInput, MessageKeyUncheckedUpdateManyInput>
    /**
     * Filter which MessageKeys to update
     */
    where?: MessageKeyWhereInput
    /**
     * Limit how many MessageKeys to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * MessageKey upsert
   */
  export type MessageKeyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    /**
     * The filter to search for the MessageKey to update in case it exists.
     */
    where: MessageKeyWhereUniqueInput
    /**
     * In case the MessageKey found by the `where` argument doesn't exist, create a new MessageKey with this data.
     */
    create: XOR<MessageKeyCreateInput, MessageKeyUncheckedCreateInput>
    /**
     * In case the MessageKey was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MessageKeyUpdateInput, MessageKeyUncheckedUpdateInput>
  }

  /**
   * MessageKey delete
   */
  export type MessageKeyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
    /**
     * Filter which MessageKey to delete.
     */
    where: MessageKeyWhereUniqueInput
  }

  /**
   * MessageKey deleteMany
   */
  export type MessageKeyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MessageKeys to delete
     */
    where?: MessageKeyWhereInput
    /**
     * Limit how many MessageKeys to delete.
     */
    limit?: number
  }

  /**
   * MessageKey without action
   */
  export type MessageKeyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageKey
     */
    select?: MessageKeySelect<ExtArgs> | null
    /**
     * Omit specific fields from the MessageKey
     */
    omit?: MessageKeyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageKeyInclude<ExtArgs> | null
  }


  /**
   * Model RatchetState
   */

  export type AggregateRatchetState = {
    _count: RatchetStateCountAggregateOutputType | null
    _avg: RatchetStateAvgAggregateOutputType | null
    _sum: RatchetStateSumAggregateOutputType | null
    _min: RatchetStateMinAggregateOutputType | null
    _max: RatchetStateMaxAggregateOutputType | null
  }

  export type RatchetStateAvgAggregateOutputType = {
    sendMessageNumber: number | null
    recvMessageNumber: number | null
  }

  export type RatchetStateSumAggregateOutputType = {
    sendMessageNumber: number | null
    recvMessageNumber: number | null
  }

  export type RatchetStateMinAggregateOutputType = {
    id: string | null
    userId: string | null
    contactId: string | null
    rootKey: string | null
    sendingChainKey: string | null
    receivingChainKey: string | null
    sendMessageNumber: number | null
    recvMessageNumber: number | null
    dhRatchetPrivate: string | null
    dhRatchetPublic: string | null
    remotePublicKey: string | null
    updatedAt: Date | null
  }

  export type RatchetStateMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    contactId: string | null
    rootKey: string | null
    sendingChainKey: string | null
    receivingChainKey: string | null
    sendMessageNumber: number | null
    recvMessageNumber: number | null
    dhRatchetPrivate: string | null
    dhRatchetPublic: string | null
    remotePublicKey: string | null
    updatedAt: Date | null
  }

  export type RatchetStateCountAggregateOutputType = {
    id: number
    userId: number
    contactId: number
    rootKey: number
    sendingChainKey: number
    receivingChainKey: number
    sendMessageNumber: number
    recvMessageNumber: number
    dhRatchetPrivate: number
    dhRatchetPublic: number
    remotePublicKey: number
    updatedAt: number
    _all: number
  }


  export type RatchetStateAvgAggregateInputType = {
    sendMessageNumber?: true
    recvMessageNumber?: true
  }

  export type RatchetStateSumAggregateInputType = {
    sendMessageNumber?: true
    recvMessageNumber?: true
  }

  export type RatchetStateMinAggregateInputType = {
    id?: true
    userId?: true
    contactId?: true
    rootKey?: true
    sendingChainKey?: true
    receivingChainKey?: true
    sendMessageNumber?: true
    recvMessageNumber?: true
    dhRatchetPrivate?: true
    dhRatchetPublic?: true
    remotePublicKey?: true
    updatedAt?: true
  }

  export type RatchetStateMaxAggregateInputType = {
    id?: true
    userId?: true
    contactId?: true
    rootKey?: true
    sendingChainKey?: true
    receivingChainKey?: true
    sendMessageNumber?: true
    recvMessageNumber?: true
    dhRatchetPrivate?: true
    dhRatchetPublic?: true
    remotePublicKey?: true
    updatedAt?: true
  }

  export type RatchetStateCountAggregateInputType = {
    id?: true
    userId?: true
    contactId?: true
    rootKey?: true
    sendingChainKey?: true
    receivingChainKey?: true
    sendMessageNumber?: true
    recvMessageNumber?: true
    dhRatchetPrivate?: true
    dhRatchetPublic?: true
    remotePublicKey?: true
    updatedAt?: true
    _all?: true
  }

  export type RatchetStateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RatchetState to aggregate.
     */
    where?: RatchetStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RatchetStates to fetch.
     */
    orderBy?: RatchetStateOrderByWithRelationInput | RatchetStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RatchetStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RatchetStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RatchetStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RatchetStates
    **/
    _count?: true | RatchetStateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RatchetStateAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RatchetStateSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RatchetStateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RatchetStateMaxAggregateInputType
  }

  export type GetRatchetStateAggregateType<T extends RatchetStateAggregateArgs> = {
        [P in keyof T & keyof AggregateRatchetState]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRatchetState[P]>
      : GetScalarType<T[P], AggregateRatchetState[P]>
  }




  export type RatchetStateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RatchetStateWhereInput
    orderBy?: RatchetStateOrderByWithAggregationInput | RatchetStateOrderByWithAggregationInput[]
    by: RatchetStateScalarFieldEnum[] | RatchetStateScalarFieldEnum
    having?: RatchetStateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RatchetStateCountAggregateInputType | true
    _avg?: RatchetStateAvgAggregateInputType
    _sum?: RatchetStateSumAggregateInputType
    _min?: RatchetStateMinAggregateInputType
    _max?: RatchetStateMaxAggregateInputType
  }

  export type RatchetStateGroupByOutputType = {
    id: string
    userId: string
    contactId: string
    rootKey: string
    sendingChainKey: string
    receivingChainKey: string
    sendMessageNumber: number
    recvMessageNumber: number
    dhRatchetPrivate: string
    dhRatchetPublic: string
    remotePublicKey: string | null
    updatedAt: Date
    _count: RatchetStateCountAggregateOutputType | null
    _avg: RatchetStateAvgAggregateOutputType | null
    _sum: RatchetStateSumAggregateOutputType | null
    _min: RatchetStateMinAggregateOutputType | null
    _max: RatchetStateMaxAggregateOutputType | null
  }

  type GetRatchetStateGroupByPayload<T extends RatchetStateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RatchetStateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RatchetStateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RatchetStateGroupByOutputType[P]>
            : GetScalarType<T[P], RatchetStateGroupByOutputType[P]>
        }
      >
    >


  export type RatchetStateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    contactId?: boolean
    rootKey?: boolean
    sendingChainKey?: boolean
    receivingChainKey?: boolean
    sendMessageNumber?: boolean
    recvMessageNumber?: boolean
    dhRatchetPrivate?: boolean
    dhRatchetPublic?: boolean
    remotePublicKey?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ratchetState"]>

  export type RatchetStateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    contactId?: boolean
    rootKey?: boolean
    sendingChainKey?: boolean
    receivingChainKey?: boolean
    sendMessageNumber?: boolean
    recvMessageNumber?: boolean
    dhRatchetPrivate?: boolean
    dhRatchetPublic?: boolean
    remotePublicKey?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ratchetState"]>

  export type RatchetStateSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    contactId?: boolean
    rootKey?: boolean
    sendingChainKey?: boolean
    receivingChainKey?: boolean
    sendMessageNumber?: boolean
    recvMessageNumber?: boolean
    dhRatchetPrivate?: boolean
    dhRatchetPublic?: boolean
    remotePublicKey?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["ratchetState"]>

  export type RatchetStateSelectScalar = {
    id?: boolean
    userId?: boolean
    contactId?: boolean
    rootKey?: boolean
    sendingChainKey?: boolean
    receivingChainKey?: boolean
    sendMessageNumber?: boolean
    recvMessageNumber?: boolean
    dhRatchetPrivate?: boolean
    dhRatchetPublic?: boolean
    remotePublicKey?: boolean
    updatedAt?: boolean
  }

  export type RatchetStateOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "contactId" | "rootKey" | "sendingChainKey" | "receivingChainKey" | "sendMessageNumber" | "recvMessageNumber" | "dhRatchetPrivate" | "dhRatchetPublic" | "remotePublicKey" | "updatedAt", ExtArgs["result"]["ratchetState"]>

  export type $RatchetStatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RatchetState"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      contactId: string
      rootKey: string
      sendingChainKey: string
      receivingChainKey: string
      sendMessageNumber: number
      recvMessageNumber: number
      dhRatchetPrivate: string
      dhRatchetPublic: string
      remotePublicKey: string | null
      updatedAt: Date
    }, ExtArgs["result"]["ratchetState"]>
    composites: {}
  }

  type RatchetStateGetPayload<S extends boolean | null | undefined | RatchetStateDefaultArgs> = $Result.GetResult<Prisma.$RatchetStatePayload, S>

  type RatchetStateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RatchetStateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RatchetStateCountAggregateInputType | true
    }

  export interface RatchetStateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RatchetState'], meta: { name: 'RatchetState' } }
    /**
     * Find zero or one RatchetState that matches the filter.
     * @param {RatchetStateFindUniqueArgs} args - Arguments to find a RatchetState
     * @example
     * // Get one RatchetState
     * const ratchetState = await prisma.ratchetState.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RatchetStateFindUniqueArgs>(args: SelectSubset<T, RatchetStateFindUniqueArgs<ExtArgs>>): Prisma__RatchetStateClient<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RatchetState that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RatchetStateFindUniqueOrThrowArgs} args - Arguments to find a RatchetState
     * @example
     * // Get one RatchetState
     * const ratchetState = await prisma.ratchetState.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RatchetStateFindUniqueOrThrowArgs>(args: SelectSubset<T, RatchetStateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RatchetStateClient<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RatchetState that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RatchetStateFindFirstArgs} args - Arguments to find a RatchetState
     * @example
     * // Get one RatchetState
     * const ratchetState = await prisma.ratchetState.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RatchetStateFindFirstArgs>(args?: SelectSubset<T, RatchetStateFindFirstArgs<ExtArgs>>): Prisma__RatchetStateClient<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RatchetState that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RatchetStateFindFirstOrThrowArgs} args - Arguments to find a RatchetState
     * @example
     * // Get one RatchetState
     * const ratchetState = await prisma.ratchetState.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RatchetStateFindFirstOrThrowArgs>(args?: SelectSubset<T, RatchetStateFindFirstOrThrowArgs<ExtArgs>>): Prisma__RatchetStateClient<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RatchetStates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RatchetStateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RatchetStates
     * const ratchetStates = await prisma.ratchetState.findMany()
     * 
     * // Get first 10 RatchetStates
     * const ratchetStates = await prisma.ratchetState.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ratchetStateWithIdOnly = await prisma.ratchetState.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RatchetStateFindManyArgs>(args?: SelectSubset<T, RatchetStateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RatchetState.
     * @param {RatchetStateCreateArgs} args - Arguments to create a RatchetState.
     * @example
     * // Create one RatchetState
     * const RatchetState = await prisma.ratchetState.create({
     *   data: {
     *     // ... data to create a RatchetState
     *   }
     * })
     * 
     */
    create<T extends RatchetStateCreateArgs>(args: SelectSubset<T, RatchetStateCreateArgs<ExtArgs>>): Prisma__RatchetStateClient<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RatchetStates.
     * @param {RatchetStateCreateManyArgs} args - Arguments to create many RatchetStates.
     * @example
     * // Create many RatchetStates
     * const ratchetState = await prisma.ratchetState.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RatchetStateCreateManyArgs>(args?: SelectSubset<T, RatchetStateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RatchetStates and returns the data saved in the database.
     * @param {RatchetStateCreateManyAndReturnArgs} args - Arguments to create many RatchetStates.
     * @example
     * // Create many RatchetStates
     * const ratchetState = await prisma.ratchetState.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RatchetStates and only return the `id`
     * const ratchetStateWithIdOnly = await prisma.ratchetState.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RatchetStateCreateManyAndReturnArgs>(args?: SelectSubset<T, RatchetStateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RatchetState.
     * @param {RatchetStateDeleteArgs} args - Arguments to delete one RatchetState.
     * @example
     * // Delete one RatchetState
     * const RatchetState = await prisma.ratchetState.delete({
     *   where: {
     *     // ... filter to delete one RatchetState
     *   }
     * })
     * 
     */
    delete<T extends RatchetStateDeleteArgs>(args: SelectSubset<T, RatchetStateDeleteArgs<ExtArgs>>): Prisma__RatchetStateClient<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RatchetState.
     * @param {RatchetStateUpdateArgs} args - Arguments to update one RatchetState.
     * @example
     * // Update one RatchetState
     * const ratchetState = await prisma.ratchetState.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RatchetStateUpdateArgs>(args: SelectSubset<T, RatchetStateUpdateArgs<ExtArgs>>): Prisma__RatchetStateClient<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RatchetStates.
     * @param {RatchetStateDeleteManyArgs} args - Arguments to filter RatchetStates to delete.
     * @example
     * // Delete a few RatchetStates
     * const { count } = await prisma.ratchetState.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RatchetStateDeleteManyArgs>(args?: SelectSubset<T, RatchetStateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RatchetStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RatchetStateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RatchetStates
     * const ratchetState = await prisma.ratchetState.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RatchetStateUpdateManyArgs>(args: SelectSubset<T, RatchetStateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RatchetStates and returns the data updated in the database.
     * @param {RatchetStateUpdateManyAndReturnArgs} args - Arguments to update many RatchetStates.
     * @example
     * // Update many RatchetStates
     * const ratchetState = await prisma.ratchetState.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RatchetStates and only return the `id`
     * const ratchetStateWithIdOnly = await prisma.ratchetState.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RatchetStateUpdateManyAndReturnArgs>(args: SelectSubset<T, RatchetStateUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RatchetState.
     * @param {RatchetStateUpsertArgs} args - Arguments to update or create a RatchetState.
     * @example
     * // Update or create a RatchetState
     * const ratchetState = await prisma.ratchetState.upsert({
     *   create: {
     *     // ... data to create a RatchetState
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RatchetState we want to update
     *   }
     * })
     */
    upsert<T extends RatchetStateUpsertArgs>(args: SelectSubset<T, RatchetStateUpsertArgs<ExtArgs>>): Prisma__RatchetStateClient<$Result.GetResult<Prisma.$RatchetStatePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RatchetStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RatchetStateCountArgs} args - Arguments to filter RatchetStates to count.
     * @example
     * // Count the number of RatchetStates
     * const count = await prisma.ratchetState.count({
     *   where: {
     *     // ... the filter for the RatchetStates we want to count
     *   }
     * })
    **/
    count<T extends RatchetStateCountArgs>(
      args?: Subset<T, RatchetStateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RatchetStateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RatchetState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RatchetStateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RatchetStateAggregateArgs>(args: Subset<T, RatchetStateAggregateArgs>): Prisma.PrismaPromise<GetRatchetStateAggregateType<T>>

    /**
     * Group by RatchetState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RatchetStateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RatchetStateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RatchetStateGroupByArgs['orderBy'] }
        : { orderBy?: RatchetStateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RatchetStateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRatchetStateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RatchetState model
   */
  readonly fields: RatchetStateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RatchetState.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RatchetStateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RatchetState model
   */
  interface RatchetStateFieldRefs {
    readonly id: FieldRef<"RatchetState", 'String'>
    readonly userId: FieldRef<"RatchetState", 'String'>
    readonly contactId: FieldRef<"RatchetState", 'String'>
    readonly rootKey: FieldRef<"RatchetState", 'String'>
    readonly sendingChainKey: FieldRef<"RatchetState", 'String'>
    readonly receivingChainKey: FieldRef<"RatchetState", 'String'>
    readonly sendMessageNumber: FieldRef<"RatchetState", 'Int'>
    readonly recvMessageNumber: FieldRef<"RatchetState", 'Int'>
    readonly dhRatchetPrivate: FieldRef<"RatchetState", 'String'>
    readonly dhRatchetPublic: FieldRef<"RatchetState", 'String'>
    readonly remotePublicKey: FieldRef<"RatchetState", 'String'>
    readonly updatedAt: FieldRef<"RatchetState", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RatchetState findUnique
   */
  export type RatchetStateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * Filter, which RatchetState to fetch.
     */
    where: RatchetStateWhereUniqueInput
  }

  /**
   * RatchetState findUniqueOrThrow
   */
  export type RatchetStateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * Filter, which RatchetState to fetch.
     */
    where: RatchetStateWhereUniqueInput
  }

  /**
   * RatchetState findFirst
   */
  export type RatchetStateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * Filter, which RatchetState to fetch.
     */
    where?: RatchetStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RatchetStates to fetch.
     */
    orderBy?: RatchetStateOrderByWithRelationInput | RatchetStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RatchetStates.
     */
    cursor?: RatchetStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RatchetStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RatchetStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RatchetStates.
     */
    distinct?: RatchetStateScalarFieldEnum | RatchetStateScalarFieldEnum[]
  }

  /**
   * RatchetState findFirstOrThrow
   */
  export type RatchetStateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * Filter, which RatchetState to fetch.
     */
    where?: RatchetStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RatchetStates to fetch.
     */
    orderBy?: RatchetStateOrderByWithRelationInput | RatchetStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RatchetStates.
     */
    cursor?: RatchetStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RatchetStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RatchetStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RatchetStates.
     */
    distinct?: RatchetStateScalarFieldEnum | RatchetStateScalarFieldEnum[]
  }

  /**
   * RatchetState findMany
   */
  export type RatchetStateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * Filter, which RatchetStates to fetch.
     */
    where?: RatchetStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RatchetStates to fetch.
     */
    orderBy?: RatchetStateOrderByWithRelationInput | RatchetStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RatchetStates.
     */
    cursor?: RatchetStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RatchetStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RatchetStates.
     */
    skip?: number
    distinct?: RatchetStateScalarFieldEnum | RatchetStateScalarFieldEnum[]
  }

  /**
   * RatchetState create
   */
  export type RatchetStateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * The data needed to create a RatchetState.
     */
    data: XOR<RatchetStateCreateInput, RatchetStateUncheckedCreateInput>
  }

  /**
   * RatchetState createMany
   */
  export type RatchetStateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RatchetStates.
     */
    data: RatchetStateCreateManyInput | RatchetStateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RatchetState createManyAndReturn
   */
  export type RatchetStateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * The data used to create many RatchetStates.
     */
    data: RatchetStateCreateManyInput | RatchetStateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RatchetState update
   */
  export type RatchetStateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * The data needed to update a RatchetState.
     */
    data: XOR<RatchetStateUpdateInput, RatchetStateUncheckedUpdateInput>
    /**
     * Choose, which RatchetState to update.
     */
    where: RatchetStateWhereUniqueInput
  }

  /**
   * RatchetState updateMany
   */
  export type RatchetStateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RatchetStates.
     */
    data: XOR<RatchetStateUpdateManyMutationInput, RatchetStateUncheckedUpdateManyInput>
    /**
     * Filter which RatchetStates to update
     */
    where?: RatchetStateWhereInput
    /**
     * Limit how many RatchetStates to update.
     */
    limit?: number
  }

  /**
   * RatchetState updateManyAndReturn
   */
  export type RatchetStateUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * The data used to update RatchetStates.
     */
    data: XOR<RatchetStateUpdateManyMutationInput, RatchetStateUncheckedUpdateManyInput>
    /**
     * Filter which RatchetStates to update
     */
    where?: RatchetStateWhereInput
    /**
     * Limit how many RatchetStates to update.
     */
    limit?: number
  }

  /**
   * RatchetState upsert
   */
  export type RatchetStateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * The filter to search for the RatchetState to update in case it exists.
     */
    where: RatchetStateWhereUniqueInput
    /**
     * In case the RatchetState found by the `where` argument doesn't exist, create a new RatchetState with this data.
     */
    create: XOR<RatchetStateCreateInput, RatchetStateUncheckedCreateInput>
    /**
     * In case the RatchetState was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RatchetStateUpdateInput, RatchetStateUncheckedUpdateInput>
  }

  /**
   * RatchetState delete
   */
  export type RatchetStateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
    /**
     * Filter which RatchetState to delete.
     */
    where: RatchetStateWhereUniqueInput
  }

  /**
   * RatchetState deleteMany
   */
  export type RatchetStateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RatchetStates to delete
     */
    where?: RatchetStateWhereInput
    /**
     * Limit how many RatchetStates to delete.
     */
    limit?: number
  }

  /**
   * RatchetState without action
   */
  export type RatchetStateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RatchetState
     */
    select?: RatchetStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RatchetState
     */
    omit?: RatchetStateOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    nickName: 'nickName',
    key: 'key',
    createdAt: 'createdAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const MessageScalarFieldEnum: {
    id: 'id',
    senderId: 'senderId',
    recipientId: 'recipientId',
    encryptedContent: 'encryptedContent',
    ephemeralKey: 'ephemeralKey',
    nonce: 'nonce',
    messageNumber: 'messageNumber',
    previousChainN: 'previousChainN',
    timestamp: 'timestamp',
    isEdited: 'isEdited',
    editedAt: 'editedAt',
    deleteType: 'deleteType',
    deletedAt: 'deletedAt',
    replyToId: 'replyToId'
  };

  export type MessageScalarFieldEnum = (typeof MessageScalarFieldEnum)[keyof typeof MessageScalarFieldEnum]


  export const MessageKeyScalarFieldEnum: {
    id: 'id',
    messageId: 'messageId',
    userId: 'userId',
    encryptedKey: 'encryptedKey',
    ephemeralPublicKey: 'ephemeralPublicKey',
    chainKeySnapshot: 'chainKeySnapshot',
    keyIndex: 'keyIndex',
    createdAt: 'createdAt'
  };

  export type MessageKeyScalarFieldEnum = (typeof MessageKeyScalarFieldEnum)[keyof typeof MessageKeyScalarFieldEnum]


  export const RatchetStateScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    contactId: 'contactId',
    rootKey: 'rootKey',
    sendingChainKey: 'sendingChainKey',
    receivingChainKey: 'receivingChainKey',
    sendMessageNumber: 'sendMessageNumber',
    recvMessageNumber: 'recvMessageNumber',
    dhRatchetPrivate: 'dhRatchetPrivate',
    dhRatchetPublic: 'dhRatchetPublic',
    remotePublicKey: 'remotePublicKey',
    updatedAt: 'updatedAt'
  };

  export type RatchetStateScalarFieldEnum = (typeof RatchetStateScalarFieldEnum)[keyof typeof RatchetStateScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    nickName?: StringFilter<"User"> | string
    key?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    sentMessages?: MessageListRelationFilter
    receivedMessages?: MessageListRelationFilter
    messageKeys?: MessageKeyListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    nickName?: SortOrder
    key?: SortOrder
    createdAt?: SortOrder
    sentMessages?: MessageOrderByRelationAggregateInput
    receivedMessages?: MessageOrderByRelationAggregateInput
    messageKeys?: MessageKeyOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    nickName?: string
    key?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    createdAt?: DateTimeFilter<"User"> | Date | string
    sentMessages?: MessageListRelationFilter
    receivedMessages?: MessageListRelationFilter
    messageKeys?: MessageKeyListRelationFilter
  }, "id" | "nickName" | "key">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    nickName?: SortOrder
    key?: SortOrder
    createdAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    nickName?: StringWithAggregatesFilter<"User"> | string
    key?: StringWithAggregatesFilter<"User"> | string
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type MessageWhereInput = {
    AND?: MessageWhereInput | MessageWhereInput[]
    OR?: MessageWhereInput[]
    NOT?: MessageWhereInput | MessageWhereInput[]
    id?: StringFilter<"Message"> | string
    senderId?: StringFilter<"Message"> | string
    recipientId?: StringFilter<"Message"> | string
    encryptedContent?: StringFilter<"Message"> | string
    ephemeralKey?: StringNullableFilter<"Message"> | string | null
    nonce?: StringNullableFilter<"Message"> | string | null
    messageNumber?: IntNullableFilter<"Message"> | number | null
    previousChainN?: IntNullableFilter<"Message"> | number | null
    timestamp?: DateTimeFilter<"Message"> | Date | string
    isEdited?: BoolFilter<"Message"> | boolean
    editedAt?: DateTimeNullableFilter<"Message"> | Date | string | null
    deleteType?: StringNullableFilter<"Message"> | string | null
    deletedAt?: DateTimeNullableFilter<"Message"> | Date | string | null
    replyToId?: StringNullableFilter<"Message"> | string | null
    sender?: XOR<UserScalarRelationFilter, UserWhereInput>
    recipient?: XOR<UserScalarRelationFilter, UserWhereInput>
    messageKeys?: MessageKeyListRelationFilter
    replyTo?: XOR<MessageNullableScalarRelationFilter, MessageWhereInput> | null
    replies?: MessageListRelationFilter
  }

  export type MessageOrderByWithRelationInput = {
    id?: SortOrder
    senderId?: SortOrder
    recipientId?: SortOrder
    encryptedContent?: SortOrder
    ephemeralKey?: SortOrderInput | SortOrder
    nonce?: SortOrderInput | SortOrder
    messageNumber?: SortOrderInput | SortOrder
    previousChainN?: SortOrderInput | SortOrder
    timestamp?: SortOrder
    isEdited?: SortOrder
    editedAt?: SortOrderInput | SortOrder
    deleteType?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    replyToId?: SortOrderInput | SortOrder
    sender?: UserOrderByWithRelationInput
    recipient?: UserOrderByWithRelationInput
    messageKeys?: MessageKeyOrderByRelationAggregateInput
    replyTo?: MessageOrderByWithRelationInput
    replies?: MessageOrderByRelationAggregateInput
  }

  export type MessageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: MessageWhereInput | MessageWhereInput[]
    OR?: MessageWhereInput[]
    NOT?: MessageWhereInput | MessageWhereInput[]
    senderId?: StringFilter<"Message"> | string
    recipientId?: StringFilter<"Message"> | string
    encryptedContent?: StringFilter<"Message"> | string
    ephemeralKey?: StringNullableFilter<"Message"> | string | null
    nonce?: StringNullableFilter<"Message"> | string | null
    messageNumber?: IntNullableFilter<"Message"> | number | null
    previousChainN?: IntNullableFilter<"Message"> | number | null
    timestamp?: DateTimeFilter<"Message"> | Date | string
    isEdited?: BoolFilter<"Message"> | boolean
    editedAt?: DateTimeNullableFilter<"Message"> | Date | string | null
    deleteType?: StringNullableFilter<"Message"> | string | null
    deletedAt?: DateTimeNullableFilter<"Message"> | Date | string | null
    replyToId?: StringNullableFilter<"Message"> | string | null
    sender?: XOR<UserScalarRelationFilter, UserWhereInput>
    recipient?: XOR<UserScalarRelationFilter, UserWhereInput>
    messageKeys?: MessageKeyListRelationFilter
    replyTo?: XOR<MessageNullableScalarRelationFilter, MessageWhereInput> | null
    replies?: MessageListRelationFilter
  }, "id">

  export type MessageOrderByWithAggregationInput = {
    id?: SortOrder
    senderId?: SortOrder
    recipientId?: SortOrder
    encryptedContent?: SortOrder
    ephemeralKey?: SortOrderInput | SortOrder
    nonce?: SortOrderInput | SortOrder
    messageNumber?: SortOrderInput | SortOrder
    previousChainN?: SortOrderInput | SortOrder
    timestamp?: SortOrder
    isEdited?: SortOrder
    editedAt?: SortOrderInput | SortOrder
    deleteType?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    replyToId?: SortOrderInput | SortOrder
    _count?: MessageCountOrderByAggregateInput
    _avg?: MessageAvgOrderByAggregateInput
    _max?: MessageMaxOrderByAggregateInput
    _min?: MessageMinOrderByAggregateInput
    _sum?: MessageSumOrderByAggregateInput
  }

  export type MessageScalarWhereWithAggregatesInput = {
    AND?: MessageScalarWhereWithAggregatesInput | MessageScalarWhereWithAggregatesInput[]
    OR?: MessageScalarWhereWithAggregatesInput[]
    NOT?: MessageScalarWhereWithAggregatesInput | MessageScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Message"> | string
    senderId?: StringWithAggregatesFilter<"Message"> | string
    recipientId?: StringWithAggregatesFilter<"Message"> | string
    encryptedContent?: StringWithAggregatesFilter<"Message"> | string
    ephemeralKey?: StringNullableWithAggregatesFilter<"Message"> | string | null
    nonce?: StringNullableWithAggregatesFilter<"Message"> | string | null
    messageNumber?: IntNullableWithAggregatesFilter<"Message"> | number | null
    previousChainN?: IntNullableWithAggregatesFilter<"Message"> | number | null
    timestamp?: DateTimeWithAggregatesFilter<"Message"> | Date | string
    isEdited?: BoolWithAggregatesFilter<"Message"> | boolean
    editedAt?: DateTimeNullableWithAggregatesFilter<"Message"> | Date | string | null
    deleteType?: StringNullableWithAggregatesFilter<"Message"> | string | null
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Message"> | Date | string | null
    replyToId?: StringNullableWithAggregatesFilter<"Message"> | string | null
  }

  export type MessageKeyWhereInput = {
    AND?: MessageKeyWhereInput | MessageKeyWhereInput[]
    OR?: MessageKeyWhereInput[]
    NOT?: MessageKeyWhereInput | MessageKeyWhereInput[]
    id?: StringFilter<"MessageKey"> | string
    messageId?: StringFilter<"MessageKey"> | string
    userId?: StringFilter<"MessageKey"> | string
    encryptedKey?: StringFilter<"MessageKey"> | string
    ephemeralPublicKey?: StringNullableFilter<"MessageKey"> | string | null
    chainKeySnapshot?: StringFilter<"MessageKey"> | string
    keyIndex?: IntFilter<"MessageKey"> | number
    createdAt?: DateTimeFilter<"MessageKey"> | Date | string
    message?: XOR<MessageScalarRelationFilter, MessageWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type MessageKeyOrderByWithRelationInput = {
    id?: SortOrder
    messageId?: SortOrder
    userId?: SortOrder
    encryptedKey?: SortOrder
    ephemeralPublicKey?: SortOrderInput | SortOrder
    chainKeySnapshot?: SortOrder
    keyIndex?: SortOrder
    createdAt?: SortOrder
    message?: MessageOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type MessageKeyWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    messageId_userId?: MessageKeyMessageIdUserIdCompoundUniqueInput
    AND?: MessageKeyWhereInput | MessageKeyWhereInput[]
    OR?: MessageKeyWhereInput[]
    NOT?: MessageKeyWhereInput | MessageKeyWhereInput[]
    messageId?: StringFilter<"MessageKey"> | string
    userId?: StringFilter<"MessageKey"> | string
    encryptedKey?: StringFilter<"MessageKey"> | string
    ephemeralPublicKey?: StringNullableFilter<"MessageKey"> | string | null
    chainKeySnapshot?: StringFilter<"MessageKey"> | string
    keyIndex?: IntFilter<"MessageKey"> | number
    createdAt?: DateTimeFilter<"MessageKey"> | Date | string
    message?: XOR<MessageScalarRelationFilter, MessageWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "messageId_userId">

  export type MessageKeyOrderByWithAggregationInput = {
    id?: SortOrder
    messageId?: SortOrder
    userId?: SortOrder
    encryptedKey?: SortOrder
    ephemeralPublicKey?: SortOrderInput | SortOrder
    chainKeySnapshot?: SortOrder
    keyIndex?: SortOrder
    createdAt?: SortOrder
    _count?: MessageKeyCountOrderByAggregateInput
    _avg?: MessageKeyAvgOrderByAggregateInput
    _max?: MessageKeyMaxOrderByAggregateInput
    _min?: MessageKeyMinOrderByAggregateInput
    _sum?: MessageKeySumOrderByAggregateInput
  }

  export type MessageKeyScalarWhereWithAggregatesInput = {
    AND?: MessageKeyScalarWhereWithAggregatesInput | MessageKeyScalarWhereWithAggregatesInput[]
    OR?: MessageKeyScalarWhereWithAggregatesInput[]
    NOT?: MessageKeyScalarWhereWithAggregatesInput | MessageKeyScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MessageKey"> | string
    messageId?: StringWithAggregatesFilter<"MessageKey"> | string
    userId?: StringWithAggregatesFilter<"MessageKey"> | string
    encryptedKey?: StringWithAggregatesFilter<"MessageKey"> | string
    ephemeralPublicKey?: StringNullableWithAggregatesFilter<"MessageKey"> | string | null
    chainKeySnapshot?: StringWithAggregatesFilter<"MessageKey"> | string
    keyIndex?: IntWithAggregatesFilter<"MessageKey"> | number
    createdAt?: DateTimeWithAggregatesFilter<"MessageKey"> | Date | string
  }

  export type RatchetStateWhereInput = {
    AND?: RatchetStateWhereInput | RatchetStateWhereInput[]
    OR?: RatchetStateWhereInput[]
    NOT?: RatchetStateWhereInput | RatchetStateWhereInput[]
    id?: StringFilter<"RatchetState"> | string
    userId?: StringFilter<"RatchetState"> | string
    contactId?: StringFilter<"RatchetState"> | string
    rootKey?: StringFilter<"RatchetState"> | string
    sendingChainKey?: StringFilter<"RatchetState"> | string
    receivingChainKey?: StringFilter<"RatchetState"> | string
    sendMessageNumber?: IntFilter<"RatchetState"> | number
    recvMessageNumber?: IntFilter<"RatchetState"> | number
    dhRatchetPrivate?: StringFilter<"RatchetState"> | string
    dhRatchetPublic?: StringFilter<"RatchetState"> | string
    remotePublicKey?: StringNullableFilter<"RatchetState"> | string | null
    updatedAt?: DateTimeFilter<"RatchetState"> | Date | string
  }

  export type RatchetStateOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    contactId?: SortOrder
    rootKey?: SortOrder
    sendingChainKey?: SortOrder
    receivingChainKey?: SortOrder
    sendMessageNumber?: SortOrder
    recvMessageNumber?: SortOrder
    dhRatchetPrivate?: SortOrder
    dhRatchetPublic?: SortOrder
    remotePublicKey?: SortOrderInput | SortOrder
    updatedAt?: SortOrder
  }

  export type RatchetStateWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_contactId?: RatchetStateUserIdContactIdCompoundUniqueInput
    AND?: RatchetStateWhereInput | RatchetStateWhereInput[]
    OR?: RatchetStateWhereInput[]
    NOT?: RatchetStateWhereInput | RatchetStateWhereInput[]
    userId?: StringFilter<"RatchetState"> | string
    contactId?: StringFilter<"RatchetState"> | string
    rootKey?: StringFilter<"RatchetState"> | string
    sendingChainKey?: StringFilter<"RatchetState"> | string
    receivingChainKey?: StringFilter<"RatchetState"> | string
    sendMessageNumber?: IntFilter<"RatchetState"> | number
    recvMessageNumber?: IntFilter<"RatchetState"> | number
    dhRatchetPrivate?: StringFilter<"RatchetState"> | string
    dhRatchetPublic?: StringFilter<"RatchetState"> | string
    remotePublicKey?: StringNullableFilter<"RatchetState"> | string | null
    updatedAt?: DateTimeFilter<"RatchetState"> | Date | string
  }, "id" | "userId_contactId">

  export type RatchetStateOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    contactId?: SortOrder
    rootKey?: SortOrder
    sendingChainKey?: SortOrder
    receivingChainKey?: SortOrder
    sendMessageNumber?: SortOrder
    recvMessageNumber?: SortOrder
    dhRatchetPrivate?: SortOrder
    dhRatchetPublic?: SortOrder
    remotePublicKey?: SortOrderInput | SortOrder
    updatedAt?: SortOrder
    _count?: RatchetStateCountOrderByAggregateInput
    _avg?: RatchetStateAvgOrderByAggregateInput
    _max?: RatchetStateMaxOrderByAggregateInput
    _min?: RatchetStateMinOrderByAggregateInput
    _sum?: RatchetStateSumOrderByAggregateInput
  }

  export type RatchetStateScalarWhereWithAggregatesInput = {
    AND?: RatchetStateScalarWhereWithAggregatesInput | RatchetStateScalarWhereWithAggregatesInput[]
    OR?: RatchetStateScalarWhereWithAggregatesInput[]
    NOT?: RatchetStateScalarWhereWithAggregatesInput | RatchetStateScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RatchetState"> | string
    userId?: StringWithAggregatesFilter<"RatchetState"> | string
    contactId?: StringWithAggregatesFilter<"RatchetState"> | string
    rootKey?: StringWithAggregatesFilter<"RatchetState"> | string
    sendingChainKey?: StringWithAggregatesFilter<"RatchetState"> | string
    receivingChainKey?: StringWithAggregatesFilter<"RatchetState"> | string
    sendMessageNumber?: IntWithAggregatesFilter<"RatchetState"> | number
    recvMessageNumber?: IntWithAggregatesFilter<"RatchetState"> | number
    dhRatchetPrivate?: StringWithAggregatesFilter<"RatchetState"> | string
    dhRatchetPublic?: StringWithAggregatesFilter<"RatchetState"> | string
    remotePublicKey?: StringNullableWithAggregatesFilter<"RatchetState"> | string | null
    updatedAt?: DateTimeWithAggregatesFilter<"RatchetState"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    nickName: string
    key: string
    createdAt?: Date | string
    sentMessages?: MessageCreateNestedManyWithoutSenderInput
    receivedMessages?: MessageCreateNestedManyWithoutRecipientInput
    messageKeys?: MessageKeyCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    nickName: string
    key: string
    createdAt?: Date | string
    sentMessages?: MessageUncheckedCreateNestedManyWithoutSenderInput
    receivedMessages?: MessageUncheckedCreateNestedManyWithoutRecipientInput
    messageKeys?: MessageKeyUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentMessages?: MessageUpdateManyWithoutSenderNestedInput
    receivedMessages?: MessageUpdateManyWithoutRecipientNestedInput
    messageKeys?: MessageKeyUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentMessages?: MessageUncheckedUpdateManyWithoutSenderNestedInput
    receivedMessages?: MessageUncheckedUpdateManyWithoutRecipientNestedInput
    messageKeys?: MessageKeyUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    nickName: string
    key: string
    createdAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageCreateInput = {
    id: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    sender: UserCreateNestedOneWithoutSentMessagesInput
    recipient: UserCreateNestedOneWithoutReceivedMessagesInput
    messageKeys?: MessageKeyCreateNestedManyWithoutMessageInput
    replyTo?: MessageCreateNestedOneWithoutRepliesInput
    replies?: MessageCreateNestedManyWithoutReplyToInput
  }

  export type MessageUncheckedCreateInput = {
    id: string
    senderId: string
    recipientId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    replyToId?: string | null
    messageKeys?: MessageKeyUncheckedCreateNestedManyWithoutMessageInput
    replies?: MessageUncheckedCreateNestedManyWithoutReplyToInput
  }

  export type MessageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sender?: UserUpdateOneRequiredWithoutSentMessagesNestedInput
    recipient?: UserUpdateOneRequiredWithoutReceivedMessagesNestedInput
    messageKeys?: MessageKeyUpdateManyWithoutMessageNestedInput
    replyTo?: MessageUpdateOneWithoutRepliesNestedInput
    replies?: MessageUpdateManyWithoutReplyToNestedInput
  }

  export type MessageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    senderId?: StringFieldUpdateOperationsInput | string
    recipientId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    replyToId?: NullableStringFieldUpdateOperationsInput | string | null
    messageKeys?: MessageKeyUncheckedUpdateManyWithoutMessageNestedInput
    replies?: MessageUncheckedUpdateManyWithoutReplyToNestedInput
  }

  export type MessageCreateManyInput = {
    id: string
    senderId: string
    recipientId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    replyToId?: string | null
  }

  export type MessageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type MessageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    senderId?: StringFieldUpdateOperationsInput | string
    recipientId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    replyToId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MessageKeyCreateInput = {
    id?: string
    encryptedKey: string
    ephemeralPublicKey?: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt?: Date | string
    message: MessageCreateNestedOneWithoutMessageKeysInput
    user: UserCreateNestedOneWithoutMessageKeysInput
  }

  export type MessageKeyUncheckedCreateInput = {
    id?: string
    messageId: string
    userId: string
    encryptedKey: string
    ephemeralPublicKey?: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt?: Date | string
  }

  export type MessageKeyUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    message?: MessageUpdateOneRequiredWithoutMessageKeysNestedInput
    user?: UserUpdateOneRequiredWithoutMessageKeysNestedInput
  }

  export type MessageKeyUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageKeyCreateManyInput = {
    id?: string
    messageId: string
    userId: string
    encryptedKey: string
    ephemeralPublicKey?: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt?: Date | string
  }

  export type MessageKeyUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageKeyUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RatchetStateCreateInput = {
    id?: string
    userId: string
    contactId: string
    rootKey: string
    sendingChainKey: string
    receivingChainKey: string
    sendMessageNumber: number
    recvMessageNumber: number
    dhRatchetPrivate: string
    dhRatchetPublic: string
    remotePublicKey?: string | null
    updatedAt?: Date | string
  }

  export type RatchetStateUncheckedCreateInput = {
    id?: string
    userId: string
    contactId: string
    rootKey: string
    sendingChainKey: string
    receivingChainKey: string
    sendMessageNumber: number
    recvMessageNumber: number
    dhRatchetPrivate: string
    dhRatchetPublic: string
    remotePublicKey?: string | null
    updatedAt?: Date | string
  }

  export type RatchetStateUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    contactId?: StringFieldUpdateOperationsInput | string
    rootKey?: StringFieldUpdateOperationsInput | string
    sendingChainKey?: StringFieldUpdateOperationsInput | string
    receivingChainKey?: StringFieldUpdateOperationsInput | string
    sendMessageNumber?: IntFieldUpdateOperationsInput | number
    recvMessageNumber?: IntFieldUpdateOperationsInput | number
    dhRatchetPrivate?: StringFieldUpdateOperationsInput | string
    dhRatchetPublic?: StringFieldUpdateOperationsInput | string
    remotePublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RatchetStateUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    contactId?: StringFieldUpdateOperationsInput | string
    rootKey?: StringFieldUpdateOperationsInput | string
    sendingChainKey?: StringFieldUpdateOperationsInput | string
    receivingChainKey?: StringFieldUpdateOperationsInput | string
    sendMessageNumber?: IntFieldUpdateOperationsInput | number
    recvMessageNumber?: IntFieldUpdateOperationsInput | number
    dhRatchetPrivate?: StringFieldUpdateOperationsInput | string
    dhRatchetPublic?: StringFieldUpdateOperationsInput | string
    remotePublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RatchetStateCreateManyInput = {
    id?: string
    userId: string
    contactId: string
    rootKey: string
    sendingChainKey: string
    receivingChainKey: string
    sendMessageNumber: number
    recvMessageNumber: number
    dhRatchetPrivate: string
    dhRatchetPublic: string
    remotePublicKey?: string | null
    updatedAt?: Date | string
  }

  export type RatchetStateUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    contactId?: StringFieldUpdateOperationsInput | string
    rootKey?: StringFieldUpdateOperationsInput | string
    sendingChainKey?: StringFieldUpdateOperationsInput | string
    receivingChainKey?: StringFieldUpdateOperationsInput | string
    sendMessageNumber?: IntFieldUpdateOperationsInput | number
    recvMessageNumber?: IntFieldUpdateOperationsInput | number
    dhRatchetPrivate?: StringFieldUpdateOperationsInput | string
    dhRatchetPublic?: StringFieldUpdateOperationsInput | string
    remotePublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RatchetStateUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    contactId?: StringFieldUpdateOperationsInput | string
    rootKey?: StringFieldUpdateOperationsInput | string
    sendingChainKey?: StringFieldUpdateOperationsInput | string
    receivingChainKey?: StringFieldUpdateOperationsInput | string
    sendMessageNumber?: IntFieldUpdateOperationsInput | number
    recvMessageNumber?: IntFieldUpdateOperationsInput | number
    dhRatchetPrivate?: StringFieldUpdateOperationsInput | string
    dhRatchetPublic?: StringFieldUpdateOperationsInput | string
    remotePublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type MessageListRelationFilter = {
    every?: MessageWhereInput
    some?: MessageWhereInput
    none?: MessageWhereInput
  }

  export type MessageKeyListRelationFilter = {
    every?: MessageKeyWhereInput
    some?: MessageKeyWhereInput
    none?: MessageKeyWhereInput
  }

  export type MessageOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type MessageKeyOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    nickName?: SortOrder
    key?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    nickName?: SortOrder
    key?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    nickName?: SortOrder
    key?: SortOrder
    createdAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type MessageNullableScalarRelationFilter = {
    is?: MessageWhereInput | null
    isNot?: MessageWhereInput | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type MessageCountOrderByAggregateInput = {
    id?: SortOrder
    senderId?: SortOrder
    recipientId?: SortOrder
    encryptedContent?: SortOrder
    ephemeralKey?: SortOrder
    nonce?: SortOrder
    messageNumber?: SortOrder
    previousChainN?: SortOrder
    timestamp?: SortOrder
    isEdited?: SortOrder
    editedAt?: SortOrder
    deleteType?: SortOrder
    deletedAt?: SortOrder
    replyToId?: SortOrder
  }

  export type MessageAvgOrderByAggregateInput = {
    messageNumber?: SortOrder
    previousChainN?: SortOrder
  }

  export type MessageMaxOrderByAggregateInput = {
    id?: SortOrder
    senderId?: SortOrder
    recipientId?: SortOrder
    encryptedContent?: SortOrder
    ephemeralKey?: SortOrder
    nonce?: SortOrder
    messageNumber?: SortOrder
    previousChainN?: SortOrder
    timestamp?: SortOrder
    isEdited?: SortOrder
    editedAt?: SortOrder
    deleteType?: SortOrder
    deletedAt?: SortOrder
    replyToId?: SortOrder
  }

  export type MessageMinOrderByAggregateInput = {
    id?: SortOrder
    senderId?: SortOrder
    recipientId?: SortOrder
    encryptedContent?: SortOrder
    ephemeralKey?: SortOrder
    nonce?: SortOrder
    messageNumber?: SortOrder
    previousChainN?: SortOrder
    timestamp?: SortOrder
    isEdited?: SortOrder
    editedAt?: SortOrder
    deleteType?: SortOrder
    deletedAt?: SortOrder
    replyToId?: SortOrder
  }

  export type MessageSumOrderByAggregateInput = {
    messageNumber?: SortOrder
    previousChainN?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type MessageScalarRelationFilter = {
    is?: MessageWhereInput
    isNot?: MessageWhereInput
  }

  export type MessageKeyMessageIdUserIdCompoundUniqueInput = {
    messageId: string
    userId: string
  }

  export type MessageKeyCountOrderByAggregateInput = {
    id?: SortOrder
    messageId?: SortOrder
    userId?: SortOrder
    encryptedKey?: SortOrder
    ephemeralPublicKey?: SortOrder
    chainKeySnapshot?: SortOrder
    keyIndex?: SortOrder
    createdAt?: SortOrder
  }

  export type MessageKeyAvgOrderByAggregateInput = {
    keyIndex?: SortOrder
  }

  export type MessageKeyMaxOrderByAggregateInput = {
    id?: SortOrder
    messageId?: SortOrder
    userId?: SortOrder
    encryptedKey?: SortOrder
    ephemeralPublicKey?: SortOrder
    chainKeySnapshot?: SortOrder
    keyIndex?: SortOrder
    createdAt?: SortOrder
  }

  export type MessageKeyMinOrderByAggregateInput = {
    id?: SortOrder
    messageId?: SortOrder
    userId?: SortOrder
    encryptedKey?: SortOrder
    ephemeralPublicKey?: SortOrder
    chainKeySnapshot?: SortOrder
    keyIndex?: SortOrder
    createdAt?: SortOrder
  }

  export type MessageKeySumOrderByAggregateInput = {
    keyIndex?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type RatchetStateUserIdContactIdCompoundUniqueInput = {
    userId: string
    contactId: string
  }

  export type RatchetStateCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    contactId?: SortOrder
    rootKey?: SortOrder
    sendingChainKey?: SortOrder
    receivingChainKey?: SortOrder
    sendMessageNumber?: SortOrder
    recvMessageNumber?: SortOrder
    dhRatchetPrivate?: SortOrder
    dhRatchetPublic?: SortOrder
    remotePublicKey?: SortOrder
    updatedAt?: SortOrder
  }

  export type RatchetStateAvgOrderByAggregateInput = {
    sendMessageNumber?: SortOrder
    recvMessageNumber?: SortOrder
  }

  export type RatchetStateMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    contactId?: SortOrder
    rootKey?: SortOrder
    sendingChainKey?: SortOrder
    receivingChainKey?: SortOrder
    sendMessageNumber?: SortOrder
    recvMessageNumber?: SortOrder
    dhRatchetPrivate?: SortOrder
    dhRatchetPublic?: SortOrder
    remotePublicKey?: SortOrder
    updatedAt?: SortOrder
  }

  export type RatchetStateMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    contactId?: SortOrder
    rootKey?: SortOrder
    sendingChainKey?: SortOrder
    receivingChainKey?: SortOrder
    sendMessageNumber?: SortOrder
    recvMessageNumber?: SortOrder
    dhRatchetPrivate?: SortOrder
    dhRatchetPublic?: SortOrder
    remotePublicKey?: SortOrder
    updatedAt?: SortOrder
  }

  export type RatchetStateSumOrderByAggregateInput = {
    sendMessageNumber?: SortOrder
    recvMessageNumber?: SortOrder
  }

  export type MessageCreateNestedManyWithoutSenderInput = {
    create?: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput> | MessageCreateWithoutSenderInput[] | MessageUncheckedCreateWithoutSenderInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutSenderInput | MessageCreateOrConnectWithoutSenderInput[]
    createMany?: MessageCreateManySenderInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type MessageCreateNestedManyWithoutRecipientInput = {
    create?: XOR<MessageCreateWithoutRecipientInput, MessageUncheckedCreateWithoutRecipientInput> | MessageCreateWithoutRecipientInput[] | MessageUncheckedCreateWithoutRecipientInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutRecipientInput | MessageCreateOrConnectWithoutRecipientInput[]
    createMany?: MessageCreateManyRecipientInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type MessageKeyCreateNestedManyWithoutUserInput = {
    create?: XOR<MessageKeyCreateWithoutUserInput, MessageKeyUncheckedCreateWithoutUserInput> | MessageKeyCreateWithoutUserInput[] | MessageKeyUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MessageKeyCreateOrConnectWithoutUserInput | MessageKeyCreateOrConnectWithoutUserInput[]
    createMany?: MessageKeyCreateManyUserInputEnvelope
    connect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
  }

  export type MessageUncheckedCreateNestedManyWithoutSenderInput = {
    create?: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput> | MessageCreateWithoutSenderInput[] | MessageUncheckedCreateWithoutSenderInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutSenderInput | MessageCreateOrConnectWithoutSenderInput[]
    createMany?: MessageCreateManySenderInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type MessageUncheckedCreateNestedManyWithoutRecipientInput = {
    create?: XOR<MessageCreateWithoutRecipientInput, MessageUncheckedCreateWithoutRecipientInput> | MessageCreateWithoutRecipientInput[] | MessageUncheckedCreateWithoutRecipientInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutRecipientInput | MessageCreateOrConnectWithoutRecipientInput[]
    createMany?: MessageCreateManyRecipientInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type MessageKeyUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<MessageKeyCreateWithoutUserInput, MessageKeyUncheckedCreateWithoutUserInput> | MessageKeyCreateWithoutUserInput[] | MessageKeyUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MessageKeyCreateOrConnectWithoutUserInput | MessageKeyCreateOrConnectWithoutUserInput[]
    createMany?: MessageKeyCreateManyUserInputEnvelope
    connect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type MessageUpdateManyWithoutSenderNestedInput = {
    create?: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput> | MessageCreateWithoutSenderInput[] | MessageUncheckedCreateWithoutSenderInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutSenderInput | MessageCreateOrConnectWithoutSenderInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutSenderInput | MessageUpsertWithWhereUniqueWithoutSenderInput[]
    createMany?: MessageCreateManySenderInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutSenderInput | MessageUpdateWithWhereUniqueWithoutSenderInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutSenderInput | MessageUpdateManyWithWhereWithoutSenderInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type MessageUpdateManyWithoutRecipientNestedInput = {
    create?: XOR<MessageCreateWithoutRecipientInput, MessageUncheckedCreateWithoutRecipientInput> | MessageCreateWithoutRecipientInput[] | MessageUncheckedCreateWithoutRecipientInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutRecipientInput | MessageCreateOrConnectWithoutRecipientInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutRecipientInput | MessageUpsertWithWhereUniqueWithoutRecipientInput[]
    createMany?: MessageCreateManyRecipientInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutRecipientInput | MessageUpdateWithWhereUniqueWithoutRecipientInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutRecipientInput | MessageUpdateManyWithWhereWithoutRecipientInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type MessageKeyUpdateManyWithoutUserNestedInput = {
    create?: XOR<MessageKeyCreateWithoutUserInput, MessageKeyUncheckedCreateWithoutUserInput> | MessageKeyCreateWithoutUserInput[] | MessageKeyUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MessageKeyCreateOrConnectWithoutUserInput | MessageKeyCreateOrConnectWithoutUserInput[]
    upsert?: MessageKeyUpsertWithWhereUniqueWithoutUserInput | MessageKeyUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: MessageKeyCreateManyUserInputEnvelope
    set?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    disconnect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    delete?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    connect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    update?: MessageKeyUpdateWithWhereUniqueWithoutUserInput | MessageKeyUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: MessageKeyUpdateManyWithWhereWithoutUserInput | MessageKeyUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: MessageKeyScalarWhereInput | MessageKeyScalarWhereInput[]
  }

  export type MessageUncheckedUpdateManyWithoutSenderNestedInput = {
    create?: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput> | MessageCreateWithoutSenderInput[] | MessageUncheckedCreateWithoutSenderInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutSenderInput | MessageCreateOrConnectWithoutSenderInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutSenderInput | MessageUpsertWithWhereUniqueWithoutSenderInput[]
    createMany?: MessageCreateManySenderInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutSenderInput | MessageUpdateWithWhereUniqueWithoutSenderInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutSenderInput | MessageUpdateManyWithWhereWithoutSenderInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type MessageUncheckedUpdateManyWithoutRecipientNestedInput = {
    create?: XOR<MessageCreateWithoutRecipientInput, MessageUncheckedCreateWithoutRecipientInput> | MessageCreateWithoutRecipientInput[] | MessageUncheckedCreateWithoutRecipientInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutRecipientInput | MessageCreateOrConnectWithoutRecipientInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutRecipientInput | MessageUpsertWithWhereUniqueWithoutRecipientInput[]
    createMany?: MessageCreateManyRecipientInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutRecipientInput | MessageUpdateWithWhereUniqueWithoutRecipientInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutRecipientInput | MessageUpdateManyWithWhereWithoutRecipientInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type MessageKeyUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<MessageKeyCreateWithoutUserInput, MessageKeyUncheckedCreateWithoutUserInput> | MessageKeyCreateWithoutUserInput[] | MessageKeyUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MessageKeyCreateOrConnectWithoutUserInput | MessageKeyCreateOrConnectWithoutUserInput[]
    upsert?: MessageKeyUpsertWithWhereUniqueWithoutUserInput | MessageKeyUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: MessageKeyCreateManyUserInputEnvelope
    set?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    disconnect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    delete?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    connect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    update?: MessageKeyUpdateWithWhereUniqueWithoutUserInput | MessageKeyUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: MessageKeyUpdateManyWithWhereWithoutUserInput | MessageKeyUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: MessageKeyScalarWhereInput | MessageKeyScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutSentMessagesInput = {
    create?: XOR<UserCreateWithoutSentMessagesInput, UserUncheckedCreateWithoutSentMessagesInput>
    connectOrCreate?: UserCreateOrConnectWithoutSentMessagesInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutReceivedMessagesInput = {
    create?: XOR<UserCreateWithoutReceivedMessagesInput, UserUncheckedCreateWithoutReceivedMessagesInput>
    connectOrCreate?: UserCreateOrConnectWithoutReceivedMessagesInput
    connect?: UserWhereUniqueInput
  }

  export type MessageKeyCreateNestedManyWithoutMessageInput = {
    create?: XOR<MessageKeyCreateWithoutMessageInput, MessageKeyUncheckedCreateWithoutMessageInput> | MessageKeyCreateWithoutMessageInput[] | MessageKeyUncheckedCreateWithoutMessageInput[]
    connectOrCreate?: MessageKeyCreateOrConnectWithoutMessageInput | MessageKeyCreateOrConnectWithoutMessageInput[]
    createMany?: MessageKeyCreateManyMessageInputEnvelope
    connect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
  }

  export type MessageCreateNestedOneWithoutRepliesInput = {
    create?: XOR<MessageCreateWithoutRepliesInput, MessageUncheckedCreateWithoutRepliesInput>
    connectOrCreate?: MessageCreateOrConnectWithoutRepliesInput
    connect?: MessageWhereUniqueInput
  }

  export type MessageCreateNestedManyWithoutReplyToInput = {
    create?: XOR<MessageCreateWithoutReplyToInput, MessageUncheckedCreateWithoutReplyToInput> | MessageCreateWithoutReplyToInput[] | MessageUncheckedCreateWithoutReplyToInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutReplyToInput | MessageCreateOrConnectWithoutReplyToInput[]
    createMany?: MessageCreateManyReplyToInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type MessageKeyUncheckedCreateNestedManyWithoutMessageInput = {
    create?: XOR<MessageKeyCreateWithoutMessageInput, MessageKeyUncheckedCreateWithoutMessageInput> | MessageKeyCreateWithoutMessageInput[] | MessageKeyUncheckedCreateWithoutMessageInput[]
    connectOrCreate?: MessageKeyCreateOrConnectWithoutMessageInput | MessageKeyCreateOrConnectWithoutMessageInput[]
    createMany?: MessageKeyCreateManyMessageInputEnvelope
    connect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
  }

  export type MessageUncheckedCreateNestedManyWithoutReplyToInput = {
    create?: XOR<MessageCreateWithoutReplyToInput, MessageUncheckedCreateWithoutReplyToInput> | MessageCreateWithoutReplyToInput[] | MessageUncheckedCreateWithoutReplyToInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutReplyToInput | MessageCreateOrConnectWithoutReplyToInput[]
    createMany?: MessageCreateManyReplyToInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type UserUpdateOneRequiredWithoutSentMessagesNestedInput = {
    create?: XOR<UserCreateWithoutSentMessagesInput, UserUncheckedCreateWithoutSentMessagesInput>
    connectOrCreate?: UserCreateOrConnectWithoutSentMessagesInput
    upsert?: UserUpsertWithoutSentMessagesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSentMessagesInput, UserUpdateWithoutSentMessagesInput>, UserUncheckedUpdateWithoutSentMessagesInput>
  }

  export type UserUpdateOneRequiredWithoutReceivedMessagesNestedInput = {
    create?: XOR<UserCreateWithoutReceivedMessagesInput, UserUncheckedCreateWithoutReceivedMessagesInput>
    connectOrCreate?: UserCreateOrConnectWithoutReceivedMessagesInput
    upsert?: UserUpsertWithoutReceivedMessagesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutReceivedMessagesInput, UserUpdateWithoutReceivedMessagesInput>, UserUncheckedUpdateWithoutReceivedMessagesInput>
  }

  export type MessageKeyUpdateManyWithoutMessageNestedInput = {
    create?: XOR<MessageKeyCreateWithoutMessageInput, MessageKeyUncheckedCreateWithoutMessageInput> | MessageKeyCreateWithoutMessageInput[] | MessageKeyUncheckedCreateWithoutMessageInput[]
    connectOrCreate?: MessageKeyCreateOrConnectWithoutMessageInput | MessageKeyCreateOrConnectWithoutMessageInput[]
    upsert?: MessageKeyUpsertWithWhereUniqueWithoutMessageInput | MessageKeyUpsertWithWhereUniqueWithoutMessageInput[]
    createMany?: MessageKeyCreateManyMessageInputEnvelope
    set?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    disconnect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    delete?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    connect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    update?: MessageKeyUpdateWithWhereUniqueWithoutMessageInput | MessageKeyUpdateWithWhereUniqueWithoutMessageInput[]
    updateMany?: MessageKeyUpdateManyWithWhereWithoutMessageInput | MessageKeyUpdateManyWithWhereWithoutMessageInput[]
    deleteMany?: MessageKeyScalarWhereInput | MessageKeyScalarWhereInput[]
  }

  export type MessageUpdateOneWithoutRepliesNestedInput = {
    create?: XOR<MessageCreateWithoutRepliesInput, MessageUncheckedCreateWithoutRepliesInput>
    connectOrCreate?: MessageCreateOrConnectWithoutRepliesInput
    upsert?: MessageUpsertWithoutRepliesInput
    disconnect?: MessageWhereInput | boolean
    delete?: MessageWhereInput | boolean
    connect?: MessageWhereUniqueInput
    update?: XOR<XOR<MessageUpdateToOneWithWhereWithoutRepliesInput, MessageUpdateWithoutRepliesInput>, MessageUncheckedUpdateWithoutRepliesInput>
  }

  export type MessageUpdateManyWithoutReplyToNestedInput = {
    create?: XOR<MessageCreateWithoutReplyToInput, MessageUncheckedCreateWithoutReplyToInput> | MessageCreateWithoutReplyToInput[] | MessageUncheckedCreateWithoutReplyToInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutReplyToInput | MessageCreateOrConnectWithoutReplyToInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutReplyToInput | MessageUpsertWithWhereUniqueWithoutReplyToInput[]
    createMany?: MessageCreateManyReplyToInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutReplyToInput | MessageUpdateWithWhereUniqueWithoutReplyToInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutReplyToInput | MessageUpdateManyWithWhereWithoutReplyToInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type MessageKeyUncheckedUpdateManyWithoutMessageNestedInput = {
    create?: XOR<MessageKeyCreateWithoutMessageInput, MessageKeyUncheckedCreateWithoutMessageInput> | MessageKeyCreateWithoutMessageInput[] | MessageKeyUncheckedCreateWithoutMessageInput[]
    connectOrCreate?: MessageKeyCreateOrConnectWithoutMessageInput | MessageKeyCreateOrConnectWithoutMessageInput[]
    upsert?: MessageKeyUpsertWithWhereUniqueWithoutMessageInput | MessageKeyUpsertWithWhereUniqueWithoutMessageInput[]
    createMany?: MessageKeyCreateManyMessageInputEnvelope
    set?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    disconnect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    delete?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    connect?: MessageKeyWhereUniqueInput | MessageKeyWhereUniqueInput[]
    update?: MessageKeyUpdateWithWhereUniqueWithoutMessageInput | MessageKeyUpdateWithWhereUniqueWithoutMessageInput[]
    updateMany?: MessageKeyUpdateManyWithWhereWithoutMessageInput | MessageKeyUpdateManyWithWhereWithoutMessageInput[]
    deleteMany?: MessageKeyScalarWhereInput | MessageKeyScalarWhereInput[]
  }

  export type MessageUncheckedUpdateManyWithoutReplyToNestedInput = {
    create?: XOR<MessageCreateWithoutReplyToInput, MessageUncheckedCreateWithoutReplyToInput> | MessageCreateWithoutReplyToInput[] | MessageUncheckedCreateWithoutReplyToInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutReplyToInput | MessageCreateOrConnectWithoutReplyToInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutReplyToInput | MessageUpsertWithWhereUniqueWithoutReplyToInput[]
    createMany?: MessageCreateManyReplyToInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutReplyToInput | MessageUpdateWithWhereUniqueWithoutReplyToInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutReplyToInput | MessageUpdateManyWithWhereWithoutReplyToInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type MessageCreateNestedOneWithoutMessageKeysInput = {
    create?: XOR<MessageCreateWithoutMessageKeysInput, MessageUncheckedCreateWithoutMessageKeysInput>
    connectOrCreate?: MessageCreateOrConnectWithoutMessageKeysInput
    connect?: MessageWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutMessageKeysInput = {
    create?: XOR<UserCreateWithoutMessageKeysInput, UserUncheckedCreateWithoutMessageKeysInput>
    connectOrCreate?: UserCreateOrConnectWithoutMessageKeysInput
    connect?: UserWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type MessageUpdateOneRequiredWithoutMessageKeysNestedInput = {
    create?: XOR<MessageCreateWithoutMessageKeysInput, MessageUncheckedCreateWithoutMessageKeysInput>
    connectOrCreate?: MessageCreateOrConnectWithoutMessageKeysInput
    upsert?: MessageUpsertWithoutMessageKeysInput
    connect?: MessageWhereUniqueInput
    update?: XOR<XOR<MessageUpdateToOneWithWhereWithoutMessageKeysInput, MessageUpdateWithoutMessageKeysInput>, MessageUncheckedUpdateWithoutMessageKeysInput>
  }

  export type UserUpdateOneRequiredWithoutMessageKeysNestedInput = {
    create?: XOR<UserCreateWithoutMessageKeysInput, UserUncheckedCreateWithoutMessageKeysInput>
    connectOrCreate?: UserCreateOrConnectWithoutMessageKeysInput
    upsert?: UserUpsertWithoutMessageKeysInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutMessageKeysInput, UserUpdateWithoutMessageKeysInput>, UserUncheckedUpdateWithoutMessageKeysInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type MessageCreateWithoutSenderInput = {
    id: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    recipient: UserCreateNestedOneWithoutReceivedMessagesInput
    messageKeys?: MessageKeyCreateNestedManyWithoutMessageInput
    replyTo?: MessageCreateNestedOneWithoutRepliesInput
    replies?: MessageCreateNestedManyWithoutReplyToInput
  }

  export type MessageUncheckedCreateWithoutSenderInput = {
    id: string
    recipientId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    replyToId?: string | null
    messageKeys?: MessageKeyUncheckedCreateNestedManyWithoutMessageInput
    replies?: MessageUncheckedCreateNestedManyWithoutReplyToInput
  }

  export type MessageCreateOrConnectWithoutSenderInput = {
    where: MessageWhereUniqueInput
    create: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput>
  }

  export type MessageCreateManySenderInputEnvelope = {
    data: MessageCreateManySenderInput | MessageCreateManySenderInput[]
    skipDuplicates?: boolean
  }

  export type MessageCreateWithoutRecipientInput = {
    id: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    sender: UserCreateNestedOneWithoutSentMessagesInput
    messageKeys?: MessageKeyCreateNestedManyWithoutMessageInput
    replyTo?: MessageCreateNestedOneWithoutRepliesInput
    replies?: MessageCreateNestedManyWithoutReplyToInput
  }

  export type MessageUncheckedCreateWithoutRecipientInput = {
    id: string
    senderId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    replyToId?: string | null
    messageKeys?: MessageKeyUncheckedCreateNestedManyWithoutMessageInput
    replies?: MessageUncheckedCreateNestedManyWithoutReplyToInput
  }

  export type MessageCreateOrConnectWithoutRecipientInput = {
    where: MessageWhereUniqueInput
    create: XOR<MessageCreateWithoutRecipientInput, MessageUncheckedCreateWithoutRecipientInput>
  }

  export type MessageCreateManyRecipientInputEnvelope = {
    data: MessageCreateManyRecipientInput | MessageCreateManyRecipientInput[]
    skipDuplicates?: boolean
  }

  export type MessageKeyCreateWithoutUserInput = {
    id?: string
    encryptedKey: string
    ephemeralPublicKey?: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt?: Date | string
    message: MessageCreateNestedOneWithoutMessageKeysInput
  }

  export type MessageKeyUncheckedCreateWithoutUserInput = {
    id?: string
    messageId: string
    encryptedKey: string
    ephemeralPublicKey?: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt?: Date | string
  }

  export type MessageKeyCreateOrConnectWithoutUserInput = {
    where: MessageKeyWhereUniqueInput
    create: XOR<MessageKeyCreateWithoutUserInput, MessageKeyUncheckedCreateWithoutUserInput>
  }

  export type MessageKeyCreateManyUserInputEnvelope = {
    data: MessageKeyCreateManyUserInput | MessageKeyCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type MessageUpsertWithWhereUniqueWithoutSenderInput = {
    where: MessageWhereUniqueInput
    update: XOR<MessageUpdateWithoutSenderInput, MessageUncheckedUpdateWithoutSenderInput>
    create: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput>
  }

  export type MessageUpdateWithWhereUniqueWithoutSenderInput = {
    where: MessageWhereUniqueInput
    data: XOR<MessageUpdateWithoutSenderInput, MessageUncheckedUpdateWithoutSenderInput>
  }

  export type MessageUpdateManyWithWhereWithoutSenderInput = {
    where: MessageScalarWhereInput
    data: XOR<MessageUpdateManyMutationInput, MessageUncheckedUpdateManyWithoutSenderInput>
  }

  export type MessageScalarWhereInput = {
    AND?: MessageScalarWhereInput | MessageScalarWhereInput[]
    OR?: MessageScalarWhereInput[]
    NOT?: MessageScalarWhereInput | MessageScalarWhereInput[]
    id?: StringFilter<"Message"> | string
    senderId?: StringFilter<"Message"> | string
    recipientId?: StringFilter<"Message"> | string
    encryptedContent?: StringFilter<"Message"> | string
    ephemeralKey?: StringNullableFilter<"Message"> | string | null
    nonce?: StringNullableFilter<"Message"> | string | null
    messageNumber?: IntNullableFilter<"Message"> | number | null
    previousChainN?: IntNullableFilter<"Message"> | number | null
    timestamp?: DateTimeFilter<"Message"> | Date | string
    isEdited?: BoolFilter<"Message"> | boolean
    editedAt?: DateTimeNullableFilter<"Message"> | Date | string | null
    deleteType?: StringNullableFilter<"Message"> | string | null
    deletedAt?: DateTimeNullableFilter<"Message"> | Date | string | null
    replyToId?: StringNullableFilter<"Message"> | string | null
  }

  export type MessageUpsertWithWhereUniqueWithoutRecipientInput = {
    where: MessageWhereUniqueInput
    update: XOR<MessageUpdateWithoutRecipientInput, MessageUncheckedUpdateWithoutRecipientInput>
    create: XOR<MessageCreateWithoutRecipientInput, MessageUncheckedCreateWithoutRecipientInput>
  }

  export type MessageUpdateWithWhereUniqueWithoutRecipientInput = {
    where: MessageWhereUniqueInput
    data: XOR<MessageUpdateWithoutRecipientInput, MessageUncheckedUpdateWithoutRecipientInput>
  }

  export type MessageUpdateManyWithWhereWithoutRecipientInput = {
    where: MessageScalarWhereInput
    data: XOR<MessageUpdateManyMutationInput, MessageUncheckedUpdateManyWithoutRecipientInput>
  }

  export type MessageKeyUpsertWithWhereUniqueWithoutUserInput = {
    where: MessageKeyWhereUniqueInput
    update: XOR<MessageKeyUpdateWithoutUserInput, MessageKeyUncheckedUpdateWithoutUserInput>
    create: XOR<MessageKeyCreateWithoutUserInput, MessageKeyUncheckedCreateWithoutUserInput>
  }

  export type MessageKeyUpdateWithWhereUniqueWithoutUserInput = {
    where: MessageKeyWhereUniqueInput
    data: XOR<MessageKeyUpdateWithoutUserInput, MessageKeyUncheckedUpdateWithoutUserInput>
  }

  export type MessageKeyUpdateManyWithWhereWithoutUserInput = {
    where: MessageKeyScalarWhereInput
    data: XOR<MessageKeyUpdateManyMutationInput, MessageKeyUncheckedUpdateManyWithoutUserInput>
  }

  export type MessageKeyScalarWhereInput = {
    AND?: MessageKeyScalarWhereInput | MessageKeyScalarWhereInput[]
    OR?: MessageKeyScalarWhereInput[]
    NOT?: MessageKeyScalarWhereInput | MessageKeyScalarWhereInput[]
    id?: StringFilter<"MessageKey"> | string
    messageId?: StringFilter<"MessageKey"> | string
    userId?: StringFilter<"MessageKey"> | string
    encryptedKey?: StringFilter<"MessageKey"> | string
    ephemeralPublicKey?: StringNullableFilter<"MessageKey"> | string | null
    chainKeySnapshot?: StringFilter<"MessageKey"> | string
    keyIndex?: IntFilter<"MessageKey"> | number
    createdAt?: DateTimeFilter<"MessageKey"> | Date | string
  }

  export type UserCreateWithoutSentMessagesInput = {
    id?: string
    nickName: string
    key: string
    createdAt?: Date | string
    receivedMessages?: MessageCreateNestedManyWithoutRecipientInput
    messageKeys?: MessageKeyCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSentMessagesInput = {
    id?: string
    nickName: string
    key: string
    createdAt?: Date | string
    receivedMessages?: MessageUncheckedCreateNestedManyWithoutRecipientInput
    messageKeys?: MessageKeyUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSentMessagesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSentMessagesInput, UserUncheckedCreateWithoutSentMessagesInput>
  }

  export type UserCreateWithoutReceivedMessagesInput = {
    id?: string
    nickName: string
    key: string
    createdAt?: Date | string
    sentMessages?: MessageCreateNestedManyWithoutSenderInput
    messageKeys?: MessageKeyCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutReceivedMessagesInput = {
    id?: string
    nickName: string
    key: string
    createdAt?: Date | string
    sentMessages?: MessageUncheckedCreateNestedManyWithoutSenderInput
    messageKeys?: MessageKeyUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutReceivedMessagesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutReceivedMessagesInput, UserUncheckedCreateWithoutReceivedMessagesInput>
  }

  export type MessageKeyCreateWithoutMessageInput = {
    id?: string
    encryptedKey: string
    ephemeralPublicKey?: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutMessageKeysInput
  }

  export type MessageKeyUncheckedCreateWithoutMessageInput = {
    id?: string
    userId: string
    encryptedKey: string
    ephemeralPublicKey?: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt?: Date | string
  }

  export type MessageKeyCreateOrConnectWithoutMessageInput = {
    where: MessageKeyWhereUniqueInput
    create: XOR<MessageKeyCreateWithoutMessageInput, MessageKeyUncheckedCreateWithoutMessageInput>
  }

  export type MessageKeyCreateManyMessageInputEnvelope = {
    data: MessageKeyCreateManyMessageInput | MessageKeyCreateManyMessageInput[]
    skipDuplicates?: boolean
  }

  export type MessageCreateWithoutRepliesInput = {
    id: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    sender: UserCreateNestedOneWithoutSentMessagesInput
    recipient: UserCreateNestedOneWithoutReceivedMessagesInput
    messageKeys?: MessageKeyCreateNestedManyWithoutMessageInput
    replyTo?: MessageCreateNestedOneWithoutRepliesInput
  }

  export type MessageUncheckedCreateWithoutRepliesInput = {
    id: string
    senderId: string
    recipientId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    replyToId?: string | null
    messageKeys?: MessageKeyUncheckedCreateNestedManyWithoutMessageInput
  }

  export type MessageCreateOrConnectWithoutRepliesInput = {
    where: MessageWhereUniqueInput
    create: XOR<MessageCreateWithoutRepliesInput, MessageUncheckedCreateWithoutRepliesInput>
  }

  export type MessageCreateWithoutReplyToInput = {
    id: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    sender: UserCreateNestedOneWithoutSentMessagesInput
    recipient: UserCreateNestedOneWithoutReceivedMessagesInput
    messageKeys?: MessageKeyCreateNestedManyWithoutMessageInput
    replies?: MessageCreateNestedManyWithoutReplyToInput
  }

  export type MessageUncheckedCreateWithoutReplyToInput = {
    id: string
    senderId: string
    recipientId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    messageKeys?: MessageKeyUncheckedCreateNestedManyWithoutMessageInput
    replies?: MessageUncheckedCreateNestedManyWithoutReplyToInput
  }

  export type MessageCreateOrConnectWithoutReplyToInput = {
    where: MessageWhereUniqueInput
    create: XOR<MessageCreateWithoutReplyToInput, MessageUncheckedCreateWithoutReplyToInput>
  }

  export type MessageCreateManyReplyToInputEnvelope = {
    data: MessageCreateManyReplyToInput | MessageCreateManyReplyToInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutSentMessagesInput = {
    update: XOR<UserUpdateWithoutSentMessagesInput, UserUncheckedUpdateWithoutSentMessagesInput>
    create: XOR<UserCreateWithoutSentMessagesInput, UserUncheckedCreateWithoutSentMessagesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSentMessagesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSentMessagesInput, UserUncheckedUpdateWithoutSentMessagesInput>
  }

  export type UserUpdateWithoutSentMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    receivedMessages?: MessageUpdateManyWithoutRecipientNestedInput
    messageKeys?: MessageKeyUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSentMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    receivedMessages?: MessageUncheckedUpdateManyWithoutRecipientNestedInput
    messageKeys?: MessageKeyUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserUpsertWithoutReceivedMessagesInput = {
    update: XOR<UserUpdateWithoutReceivedMessagesInput, UserUncheckedUpdateWithoutReceivedMessagesInput>
    create: XOR<UserCreateWithoutReceivedMessagesInput, UserUncheckedCreateWithoutReceivedMessagesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutReceivedMessagesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutReceivedMessagesInput, UserUncheckedUpdateWithoutReceivedMessagesInput>
  }

  export type UserUpdateWithoutReceivedMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentMessages?: MessageUpdateManyWithoutSenderNestedInput
    messageKeys?: MessageKeyUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutReceivedMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentMessages?: MessageUncheckedUpdateManyWithoutSenderNestedInput
    messageKeys?: MessageKeyUncheckedUpdateManyWithoutUserNestedInput
  }

  export type MessageKeyUpsertWithWhereUniqueWithoutMessageInput = {
    where: MessageKeyWhereUniqueInput
    update: XOR<MessageKeyUpdateWithoutMessageInput, MessageKeyUncheckedUpdateWithoutMessageInput>
    create: XOR<MessageKeyCreateWithoutMessageInput, MessageKeyUncheckedCreateWithoutMessageInput>
  }

  export type MessageKeyUpdateWithWhereUniqueWithoutMessageInput = {
    where: MessageKeyWhereUniqueInput
    data: XOR<MessageKeyUpdateWithoutMessageInput, MessageKeyUncheckedUpdateWithoutMessageInput>
  }

  export type MessageKeyUpdateManyWithWhereWithoutMessageInput = {
    where: MessageKeyScalarWhereInput
    data: XOR<MessageKeyUpdateManyMutationInput, MessageKeyUncheckedUpdateManyWithoutMessageInput>
  }

  export type MessageUpsertWithoutRepliesInput = {
    update: XOR<MessageUpdateWithoutRepliesInput, MessageUncheckedUpdateWithoutRepliesInput>
    create: XOR<MessageCreateWithoutRepliesInput, MessageUncheckedCreateWithoutRepliesInput>
    where?: MessageWhereInput
  }

  export type MessageUpdateToOneWithWhereWithoutRepliesInput = {
    where?: MessageWhereInput
    data: XOR<MessageUpdateWithoutRepliesInput, MessageUncheckedUpdateWithoutRepliesInput>
  }

  export type MessageUpdateWithoutRepliesInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sender?: UserUpdateOneRequiredWithoutSentMessagesNestedInput
    recipient?: UserUpdateOneRequiredWithoutReceivedMessagesNestedInput
    messageKeys?: MessageKeyUpdateManyWithoutMessageNestedInput
    replyTo?: MessageUpdateOneWithoutRepliesNestedInput
  }

  export type MessageUncheckedUpdateWithoutRepliesInput = {
    id?: StringFieldUpdateOperationsInput | string
    senderId?: StringFieldUpdateOperationsInput | string
    recipientId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    replyToId?: NullableStringFieldUpdateOperationsInput | string | null
    messageKeys?: MessageKeyUncheckedUpdateManyWithoutMessageNestedInput
  }

  export type MessageUpsertWithWhereUniqueWithoutReplyToInput = {
    where: MessageWhereUniqueInput
    update: XOR<MessageUpdateWithoutReplyToInput, MessageUncheckedUpdateWithoutReplyToInput>
    create: XOR<MessageCreateWithoutReplyToInput, MessageUncheckedCreateWithoutReplyToInput>
  }

  export type MessageUpdateWithWhereUniqueWithoutReplyToInput = {
    where: MessageWhereUniqueInput
    data: XOR<MessageUpdateWithoutReplyToInput, MessageUncheckedUpdateWithoutReplyToInput>
  }

  export type MessageUpdateManyWithWhereWithoutReplyToInput = {
    where: MessageScalarWhereInput
    data: XOR<MessageUpdateManyMutationInput, MessageUncheckedUpdateManyWithoutReplyToInput>
  }

  export type MessageCreateWithoutMessageKeysInput = {
    id: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    sender: UserCreateNestedOneWithoutSentMessagesInput
    recipient: UserCreateNestedOneWithoutReceivedMessagesInput
    replyTo?: MessageCreateNestedOneWithoutRepliesInput
    replies?: MessageCreateNestedManyWithoutReplyToInput
  }

  export type MessageUncheckedCreateWithoutMessageKeysInput = {
    id: string
    senderId: string
    recipientId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    replyToId?: string | null
    replies?: MessageUncheckedCreateNestedManyWithoutReplyToInput
  }

  export type MessageCreateOrConnectWithoutMessageKeysInput = {
    where: MessageWhereUniqueInput
    create: XOR<MessageCreateWithoutMessageKeysInput, MessageUncheckedCreateWithoutMessageKeysInput>
  }

  export type UserCreateWithoutMessageKeysInput = {
    id?: string
    nickName: string
    key: string
    createdAt?: Date | string
    sentMessages?: MessageCreateNestedManyWithoutSenderInput
    receivedMessages?: MessageCreateNestedManyWithoutRecipientInput
  }

  export type UserUncheckedCreateWithoutMessageKeysInput = {
    id?: string
    nickName: string
    key: string
    createdAt?: Date | string
    sentMessages?: MessageUncheckedCreateNestedManyWithoutSenderInput
    receivedMessages?: MessageUncheckedCreateNestedManyWithoutRecipientInput
  }

  export type UserCreateOrConnectWithoutMessageKeysInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutMessageKeysInput, UserUncheckedCreateWithoutMessageKeysInput>
  }

  export type MessageUpsertWithoutMessageKeysInput = {
    update: XOR<MessageUpdateWithoutMessageKeysInput, MessageUncheckedUpdateWithoutMessageKeysInput>
    create: XOR<MessageCreateWithoutMessageKeysInput, MessageUncheckedCreateWithoutMessageKeysInput>
    where?: MessageWhereInput
  }

  export type MessageUpdateToOneWithWhereWithoutMessageKeysInput = {
    where?: MessageWhereInput
    data: XOR<MessageUpdateWithoutMessageKeysInput, MessageUncheckedUpdateWithoutMessageKeysInput>
  }

  export type MessageUpdateWithoutMessageKeysInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sender?: UserUpdateOneRequiredWithoutSentMessagesNestedInput
    recipient?: UserUpdateOneRequiredWithoutReceivedMessagesNestedInput
    replyTo?: MessageUpdateOneWithoutRepliesNestedInput
    replies?: MessageUpdateManyWithoutReplyToNestedInput
  }

  export type MessageUncheckedUpdateWithoutMessageKeysInput = {
    id?: StringFieldUpdateOperationsInput | string
    senderId?: StringFieldUpdateOperationsInput | string
    recipientId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    replyToId?: NullableStringFieldUpdateOperationsInput | string | null
    replies?: MessageUncheckedUpdateManyWithoutReplyToNestedInput
  }

  export type UserUpsertWithoutMessageKeysInput = {
    update: XOR<UserUpdateWithoutMessageKeysInput, UserUncheckedUpdateWithoutMessageKeysInput>
    create: XOR<UserCreateWithoutMessageKeysInput, UserUncheckedCreateWithoutMessageKeysInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutMessageKeysInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutMessageKeysInput, UserUncheckedUpdateWithoutMessageKeysInput>
  }

  export type UserUpdateWithoutMessageKeysInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentMessages?: MessageUpdateManyWithoutSenderNestedInput
    receivedMessages?: MessageUpdateManyWithoutRecipientNestedInput
  }

  export type UserUncheckedUpdateWithoutMessageKeysInput = {
    id?: StringFieldUpdateOperationsInput | string
    nickName?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sentMessages?: MessageUncheckedUpdateManyWithoutSenderNestedInput
    receivedMessages?: MessageUncheckedUpdateManyWithoutRecipientNestedInput
  }

  export type MessageCreateManySenderInput = {
    id: string
    recipientId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    replyToId?: string | null
  }

  export type MessageCreateManyRecipientInput = {
    id: string
    senderId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
    replyToId?: string | null
  }

  export type MessageKeyCreateManyUserInput = {
    id?: string
    messageId: string
    encryptedKey: string
    ephemeralPublicKey?: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt?: Date | string
  }

  export type MessageUpdateWithoutSenderInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    recipient?: UserUpdateOneRequiredWithoutReceivedMessagesNestedInput
    messageKeys?: MessageKeyUpdateManyWithoutMessageNestedInput
    replyTo?: MessageUpdateOneWithoutRepliesNestedInput
    replies?: MessageUpdateManyWithoutReplyToNestedInput
  }

  export type MessageUncheckedUpdateWithoutSenderInput = {
    id?: StringFieldUpdateOperationsInput | string
    recipientId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    replyToId?: NullableStringFieldUpdateOperationsInput | string | null
    messageKeys?: MessageKeyUncheckedUpdateManyWithoutMessageNestedInput
    replies?: MessageUncheckedUpdateManyWithoutReplyToNestedInput
  }

  export type MessageUncheckedUpdateManyWithoutSenderInput = {
    id?: StringFieldUpdateOperationsInput | string
    recipientId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    replyToId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MessageUpdateWithoutRecipientInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sender?: UserUpdateOneRequiredWithoutSentMessagesNestedInput
    messageKeys?: MessageKeyUpdateManyWithoutMessageNestedInput
    replyTo?: MessageUpdateOneWithoutRepliesNestedInput
    replies?: MessageUpdateManyWithoutReplyToNestedInput
  }

  export type MessageUncheckedUpdateWithoutRecipientInput = {
    id?: StringFieldUpdateOperationsInput | string
    senderId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    replyToId?: NullableStringFieldUpdateOperationsInput | string | null
    messageKeys?: MessageKeyUncheckedUpdateManyWithoutMessageNestedInput
    replies?: MessageUncheckedUpdateManyWithoutReplyToNestedInput
  }

  export type MessageUncheckedUpdateManyWithoutRecipientInput = {
    id?: StringFieldUpdateOperationsInput | string
    senderId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    replyToId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type MessageKeyUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    message?: MessageUpdateOneRequiredWithoutMessageKeysNestedInput
  }

  export type MessageKeyUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageKeyUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageKeyCreateManyMessageInput = {
    id?: string
    userId: string
    encryptedKey: string
    ephemeralPublicKey?: string | null
    chainKeySnapshot: string
    keyIndex: number
    createdAt?: Date | string
  }

  export type MessageCreateManyReplyToInput = {
    id: string
    senderId: string
    recipientId: string
    encryptedContent: string
    ephemeralKey?: string | null
    nonce?: string | null
    messageNumber?: number | null
    previousChainN?: number | null
    timestamp?: Date | string
    isEdited?: boolean
    editedAt?: Date | string | null
    deleteType?: string | null
    deletedAt?: Date | string | null
  }

  export type MessageKeyUpdateWithoutMessageInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutMessageKeysNestedInput
  }

  export type MessageKeyUncheckedUpdateWithoutMessageInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageKeyUncheckedUpdateManyWithoutMessageInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    encryptedKey?: StringFieldUpdateOperationsInput | string
    ephemeralPublicKey?: NullableStringFieldUpdateOperationsInput | string | null
    chainKeySnapshot?: StringFieldUpdateOperationsInput | string
    keyIndex?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageUpdateWithoutReplyToInput = {
    id?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sender?: UserUpdateOneRequiredWithoutSentMessagesNestedInput
    recipient?: UserUpdateOneRequiredWithoutReceivedMessagesNestedInput
    messageKeys?: MessageKeyUpdateManyWithoutMessageNestedInput
    replies?: MessageUpdateManyWithoutReplyToNestedInput
  }

  export type MessageUncheckedUpdateWithoutReplyToInput = {
    id?: StringFieldUpdateOperationsInput | string
    senderId?: StringFieldUpdateOperationsInput | string
    recipientId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    messageKeys?: MessageKeyUncheckedUpdateManyWithoutMessageNestedInput
    replies?: MessageUncheckedUpdateManyWithoutReplyToNestedInput
  }

  export type MessageUncheckedUpdateManyWithoutReplyToInput = {
    id?: StringFieldUpdateOperationsInput | string
    senderId?: StringFieldUpdateOperationsInput | string
    recipientId?: StringFieldUpdateOperationsInput | string
    encryptedContent?: StringFieldUpdateOperationsInput | string
    ephemeralKey?: NullableStringFieldUpdateOperationsInput | string | null
    nonce?: NullableStringFieldUpdateOperationsInput | string | null
    messageNumber?: NullableIntFieldUpdateOperationsInput | number | null
    previousChainN?: NullableIntFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    isEdited?: BoolFieldUpdateOperationsInput | boolean
    editedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deleteType?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}