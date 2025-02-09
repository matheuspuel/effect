/**
 * @since 1.0.0
 */
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Option from "effect/Option"

/**
 * @since 1.0.0
 * @category models
 */
export interface CollectorService {
  readonly addAll: (_: Iterable<globalThis.Transferable>) => Effect.Effect<void>
  readonly unsafeAddAll: (_: Iterable<globalThis.Transferable>) => void
  readonly read: Effect.Effect<ReadonlyArray<globalThis.Transferable>>
  readonly unsafeRead: () => ReadonlyArray<globalThis.Transferable>
  readonly unsafeClear: () => void
  readonly clear: Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category tags
 */
export class Collector extends Context.Tag("@effect/platform/Transferable/Collector")<
  Collector,
  CollectorService
>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeCollector = (): CollectorService => {
  const tranferables: Array<globalThis.Transferable> = []
  const unsafeAddAll = (transfers: Iterable<globalThis.Transferable>): void => {
    for (const transfer of transfers) {
      tranferables.push(transfer)
    }
  }
  const unsafeRead = (): ReadonlyArray<globalThis.Transferable> => tranferables
  const unsafeClear = (): void => {
    tranferables.length = 0
  }
  return Collector.of({
    unsafeAddAll,
    addAll: (transferables) => Effect.sync(() => unsafeAddAll(transferables)),
    unsafeRead,
    read: Effect.sync(unsafeRead),
    unsafeClear,
    clear: Effect.sync(unsafeClear)
  })
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeCollector: Effect.Effect<CollectorService> = Effect.sync(unsafeMakeCollector)

/**
 * @since 1.0.0
 * @category accessors
 */
export const addAll = (tranferables: Iterable<globalThis.Transferable>): Effect.Effect<void> =>
  Effect.flatMap(
    Effect.serviceOption(Collector),
    Option.match({
      onNone: () => Effect.unit,
      onSome: (_) => _.addAll(tranferables)
    })
  )

/**
 * @since 1.0.0
 * @category schema
 */
export const schema: {
  <I>(
    f: (_: I) => Iterable<globalThis.Transferable>
  ): <A, R>(self: Schema.Schema<A, I, R>) => Schema.Schema<A, I, R>
  <R, I, A>(
    self: Schema.Schema<A, I, R>,
    f: (_: I) => Iterable<globalThis.Transferable>
  ): Schema.Schema<A, I, R>
} = dual(2, <R, I, A>(
  self: Schema.Schema<A, I, R>,
  f: (_: I) => Iterable<globalThis.Transferable>
) =>
  Schema.transformOrFail(
    Schema.from(self),
    self,
    ParseResult.succeed,
    (i) => Effect.as(addAll(f(i)), i)
  ))

/**
 * @since 1.0.0
 * @category schema
 */
export const ImageData: Schema.Schema<ImageData> = schema(
  Schema.any,
  (_) => [(_ as ImageData).data.buffer]
)

/**
 * @since 1.0.0
 * @category schema
 */
export const MessagePort: Schema.Schema<MessagePort> = schema(
  Schema.any,
  (_) => [_ as MessagePort]
)

/**
 * @since 1.0.0
 * @category schema
 */
export const Uint8Array: Schema.Schema<Uint8Array> = schema(
  Schema.Uint8ArrayFromSelf,
  (_) => [_.buffer]
)
