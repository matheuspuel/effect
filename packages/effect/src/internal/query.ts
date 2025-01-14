import type * as Cache from "../Cache.js"
import type { Deferred } from "../Deferred.js"
import { seconds } from "../Duration.js"
import type * as Effect from "../Effect.js"
import { dual } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import type * as Request from "../Request.js"
import type * as RequestResolver from "../RequestResolver.js"
import * as BlockedRequests from "./blockedRequests.js"
import { unsafeMakeWith } from "./cache.js"
import { isInterruptedOnly } from "./cause.js"
import * as core from "./core.js"
import { ensuring } from "./fiberRuntime.js"
import { Listeners } from "./request.js"

type RequestCache = Cache.Cache<Request.Request<any, any>, never, {
  listeners: Request.Listeners
  handle: Deferred<any, any>
}>

/** @internal */
export const currentCache = globalValue(
  Symbol.for("effect/FiberRef/currentCache"),
  () =>
    core.fiberRefUnsafeMake<RequestCache>(unsafeMakeWith<Request.Request<any, any>, never, {
      listeners: Request.Listeners
      handle: Deferred<any, any>
    }>(
      65536,
      () => core.map(core.deferredMake<any, any>(), (handle) => ({ listeners: new Listeners(), handle })),
      () => seconds(60)
    ))
)

/** @internal */
export const currentCacheEnabled = globalValue(
  Symbol.for("effect/FiberRef/currentCacheEnabled"),
  () => core.fiberRefUnsafeMake(false)
)

/** @internal */
export const fromRequest = <
  A extends Request.Request<any, any>,
  Ds extends
    | RequestResolver.RequestResolver<A>
    | Effect.Effect<RequestResolver.RequestResolver<A>, any, any>
>(
  request: A,
  dataSource: Ds
): Effect.Effect<
  Request.Request.Success<A>,
  Request.Request.Error<A>,
  [Ds] extends [Effect.Effect<any, any, any>] ? Effect.Effect.Context<Ds> : never
> =>
  core.flatMap(
    (core.isEffect(dataSource) ? dataSource : core.succeed(dataSource)) as Effect.Effect<
      RequestResolver.RequestResolver<A>
    >,
    (ds) =>
      core.fiberIdWith((id) => {
        const proxy = new Proxy(request, {})
        return core.fiberRefGetWith(currentCacheEnabled, (cacheEnabled) => {
          if (cacheEnabled) {
            return core.fiberRefGetWith(currentCache, (cache) =>
              core.flatMap(cache.getEither(proxy), (orNew) => {
                switch (orNew._tag) {
                  case "Left": {
                    orNew.left.listeners.increment()
                    return core.blocked(
                      BlockedRequests.empty,
                      core.flatMap(core.exit(core.deferredAwait(orNew.left.handle)), (exit) => {
                        if (exit._tag === "Failure" && isInterruptedOnly(exit.cause)) {
                          orNew.left.listeners.decrement()
                          return core.flatMap(
                            cache.invalidateWhen(
                              proxy,
                              (entry) => entry.handle === orNew.left.handle
                            ),
                            () => fromRequest(proxy, ds)
                          )
                        }
                        return ensuring(
                          core.deferredAwait(orNew.left.handle),
                          core.sync(() => orNew.left.listeners.decrement())
                        )
                      })
                    )
                  }
                  case "Right": {
                    orNew.right.listeners.increment()
                    return core.blocked(
                      BlockedRequests.single(
                        ds as RequestResolver.RequestResolver<A>,
                        BlockedRequests.makeEntry({
                          request: proxy,
                          result: orNew.right.handle,
                          listeners: orNew.right.listeners,
                          ownerId: id,
                          state: { completed: false }
                        })
                      ),
                      core.uninterruptibleMask((restore) =>
                        core.flatMap(
                          core.exit(restore(core.deferredAwait(orNew.right.handle))),
                          (exit) => {
                            orNew.right.listeners.decrement()
                            return exit
                          }
                        )
                      )
                    )
                  }
                }
              }))
          }
          const listeners = new Listeners()
          listeners.increment()
          return core.flatMap(
            core.deferredMake<Request.Request.Success<A>, Request.Request.Error<A>>(),
            (ref) =>
              core.blocked(
                BlockedRequests.single(
                  ds as RequestResolver.RequestResolver<A>,
                  BlockedRequests.makeEntry({
                    request: proxy,
                    result: ref,
                    listeners,
                    ownerId: id,
                    state: { completed: false }
                  })
                ),
                ensuring(
                  core.deferredAwait(ref),
                  core.sync(() => listeners.decrement())
                )
              )
          )
        })
      })
  )

/** @internal */
export const cacheRequest = <A extends Request.Request<any, any>>(
  request: A,
  result: Request.Request.Result<A>
): Effect.Effect<void> => {
  return core.fiberRefGetWith(currentCacheEnabled, (cacheEnabled) => {
    if (cacheEnabled) {
      return core.fiberRefGetWith(currentCache, (cache) =>
        core.flatMap(cache.getEither(request), (orNew) => {
          switch (orNew._tag) {
            case "Left": {
              return core.unit
            }
            case "Right": {
              return core.deferredComplete(orNew.right.handle, result)
            }
          }
        }))
    }
    return core.unit
  })
}

/** @internal */
export const withRequestCaching: {
  (strategy: boolean): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    strategy: boolean
  ): Effect.Effect<A, E, R>
} = dual<
  (
    strategy: boolean
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    strategy: boolean
  ) => Effect.Effect<A, E, R>
>(2, (self, strategy) => core.fiberRefLocally(self, currentCacheEnabled, strategy))

/** @internal */
export const withRequestCache: {
  (cache: Request.Cache): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    cache: Request.Cache
  ): Effect.Effect<A, E, R>
} = dual<
  (
    cache: Request.Cache
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    cache: Request.Cache
  ) => Effect.Effect<A, E, R>
>(
  2,
  // @ts-expect-error
  (self, cache) => core.fiberRefLocally(self, currentCache, cache)
)
