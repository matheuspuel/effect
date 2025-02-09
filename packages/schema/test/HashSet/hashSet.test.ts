import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as HashSet from "effect/HashSet"
import { describe, it } from "vitest"

describe("HashSet > hashSet", () => {
  it("property tests", () => {
    Util.roundtrip(S.hashSet(S.number))
  })

  it("decoding", async () => {
    const schema = S.hashSet(S.number)
    await Util.expectDecodeUnknownSuccess(schema, [], HashSet.empty())
    await Util.expectDecodeUnknownSuccess(schema, [1, 2, 3], HashSet.fromIterable([1, 2, 3]))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(ReadonlyArray<number> <-> HashSet<number>)
└─ From side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> HashSet<number>)
└─ From side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected a number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.hashSet(S.number)
    await Util.expectEncodeSuccess(schema, HashSet.empty(), [])
    await Util.expectEncodeSuccess(schema, HashSet.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
