import { Effect, ReadonlyArray, Ref } from "effect"
import * as it from "effect-test/utils/extend"
import * as FiberSet from "effect/FiberSet"
import { assert, describe } from "vitest"

describe("FiberSet", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const set = yield* _(FiberSet.make())
          yield* _(
            Effect.onInterrupt(
              Effect.never,
              () => Ref.update(ref, (n) => n + 1)
            ).pipe(
              FiberSet.run(set)
            ),
            Effect.replicateEffect(10)
          )
          yield* _(Effect.yieldNow())
        }),
        Effect.scoped
      )

      assert.strictEqual(yield* _(Ref.get(ref)), 10)
    }))

  it.effect("runtime", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const set = yield* _(FiberSet.make())
          const run = yield* _(FiberSet.runtime(set)<never>())
          ReadonlyArray.range(1, 10).forEach(() =>
            run(
              Effect.onInterrupt(
                Effect.never,
                () => Ref.update(ref, (n) => n + 1)
              )
            )
          )
          yield* _(Effect.yieldNow())
        }),
        Effect.scoped
      )

      assert.strictEqual(yield* _(Ref.get(ref)), 10)
    }))
})
