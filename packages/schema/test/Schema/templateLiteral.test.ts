import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > templateLiteral", () => {
  it("should throw on unsupported template literal spans", () => {
    expect(() => S.templateLiteral(S.boolean)).toThrow(
      new Error("templateLiteral: unsupported template literal span (boolean)")
    )
  })

  describe("AST", () => {
    it("a", () => {
      const schema = S.templateLiteral(S.literal("a"))
      expect(schema.ast).toEqual(AST.createLiteral("a"))
    })

    it("a b", () => {
      const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
      expect(schema.ast).toEqual(
        AST.createLiteral("a b")
      )
    })

    it("(a | b) c", () => {
      const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"))
      expect(schema.ast).toEqual(
        AST.createUnion([AST.createLiteral("ac"), AST.createLiteral("bc")])
      )
    })

    it("(a | b) c (d | e)", () => {
      const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"), S.literal("d", "e"))
      expect(schema.ast).toEqual(
        AST.createUnion([
          AST.createLiteral("acd"),
          AST.createLiteral("ace"),
          AST.createLiteral("bcd"),
          AST.createLiteral("bce")
        ])
      )
    })

    it("(a | b) string (d | e)", () => {
      const schema = S.templateLiteral(S.literal("a", "b"), S.string, S.literal("d", "e"))
      expect(schema.ast).toEqual(
        AST.createUnion([
          AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "d" }]),
          AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "e" }]),
          AST.createTemplateLiteral("b", [{ type: AST.stringKeyword, literal: "d" }]),
          AST.createTemplateLiteral("b", [{ type: AST.stringKeyword, literal: "e" }])
        ])
      )
    })

    it("a${string}", () => {
      const schema = S.templateLiteral(S.literal("a"), S.string)
      expect(schema.ast).toEqual(
        AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "" }])
      )
    })

    it("a${string}b", () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
      expect(schema.ast).toEqual(
        AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "b" }])
      )
    })
  })

  describe("Decoder", () => {
    it("a", async () => {
      const schema = S.templateLiteral(S.literal("a"))
      await Util.expectDecodeUnknownSuccess(schema, "a", "a")

      await Util.expectDecodeUnknownFailure(schema, "ab", `Expected "a", actual "ab"`)
      await Util.expectDecodeUnknownFailure(schema, "", `Expected "a", actual ""`)
      await Util.expectDecodeUnknownFailure(schema, null, `Expected "a", actual null`)
    })

    it("a b", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
      await Util.expectDecodeUnknownSuccess(schema, "a b", "a b")

      await Util.expectDecodeUnknownFailure(schema, "a  b", `Expected "a b", actual "a  b"`)
    })

    it("a${string}", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.string)
      await Util.expectDecodeUnknownSuccess(schema, "a", "a")
      await Util.expectDecodeUnknownSuccess(schema, "ab", "ab")

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        "Expected `a${string}`, actual null"
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        "Expected `a${string}`, actual \"\""
      )
    })

    it("a${number}", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.number)
      await Util.expectDecodeUnknownSuccess(schema, "a1")
      await Util.expectDecodeUnknownSuccess(schema, "a1.2")

      await Util.expectDecodeUnknownSuccess(schema, "a-1.401298464324817e-45")
      await Util.expectDecodeUnknownSuccess(schema, "a1.401298464324817e-45")
      await Util.expectDecodeUnknownSuccess(schema, "a+1.401298464324817e-45")
      await Util.expectDecodeUnknownSuccess(schema, "a-1.401298464324817e+45")
      await Util.expectDecodeUnknownSuccess(schema, "a1.401298464324817e+45")
      await Util.expectDecodeUnknownSuccess(schema, "a+1.401298464324817e+45")

      await Util.expectDecodeUnknownSuccess(schema, "a-1.401298464324817E-45")
      await Util.expectDecodeUnknownSuccess(schema, "a1.401298464324817E-45")
      await Util.expectDecodeUnknownSuccess(schema, "a+1.401298464324817E-45")
      await Util.expectDecodeUnknownSuccess(schema, "a-1.401298464324817E+45")
      await Util.expectDecodeUnknownSuccess(schema, "a1.401298464324817E+45")
      await Util.expectDecodeUnknownSuccess(schema, "a+1.401298464324817E+45")

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        "Expected `a${number}`, actual null"
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        "Expected `a${number}`, actual \"\""
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "aa",
        "Expected `a${number}`, actual \"aa\""
      )
    })

    it("${string}", async () => {
      const schema = S.templateLiteral(S.string)
      await Util.expectDecodeUnknownSuccess(schema, "a", "a")
      await Util.expectDecodeUnknownSuccess(schema, "ab", "ab")
      await Util.expectDecodeUnknownSuccess(schema, "", "")
    })

    it("a${string}b", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
      await Util.expectDecodeUnknownSuccess(schema, "ab", "ab")
      await Util.expectDecodeUnknownSuccess(schema, "acb", "acb")
      await Util.expectDecodeUnknownSuccess(schema, "abb", "abb")
      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        "Expected `a${string}b`, actual \"\""
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "a",
        "Expected `a${string}b`, actual \"a\""
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "b",
        "Expected `a${string}b`, actual \"b\""
      )
      await Util.expectEncodeSuccess(schema, "acb", "acb")
    })

    it("a${string}b${string}", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"), S.string)
      await Util.expectDecodeUnknownSuccess(schema, "ab", "ab")
      await Util.expectDecodeUnknownSuccess(schema, "acb", "acb")
      await Util.expectDecodeUnknownSuccess(schema, "acbd", "acbd")

      await Util.expectDecodeUnknownFailure(
        schema,
        "a",
        "Expected `a${string}b${string}`, actual \"a\""
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "b",
        "Expected `a${string}b${string}`, actual \"b\""
      )
    })

    it("https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html", async () => {
      const EmailLocaleIDs = S.literal("welcome_email", "email_heading")
      const FooterLocaleIDs = S.literal("footer_title", "footer_sendoff")
      const schema = S.templateLiteral(S.union(EmailLocaleIDs, FooterLocaleIDs), S.literal("_id"))
      await Util.expectDecodeUnknownSuccess(schema, "welcome_email_id", "welcome_email_id")
      await Util.expectDecodeUnknownSuccess(schema, "email_heading_id", "email_heading_id")
      await Util.expectDecodeUnknownSuccess(schema, "footer_title_id", "footer_title_id")
      await Util.expectDecodeUnknownSuccess(schema, "footer_sendoff_id", "footer_sendoff_id")

      await Util.expectDecodeUnknownFailure(
        schema,
        "_id",
        `"welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id"
├─ Union member
│  └─ Expected "welcome_email_id", actual "_id"
├─ Union member
│  └─ Expected "email_heading_id", actual "_id"
├─ Union member
│  └─ Expected "footer_title_id", actual "_id"
└─ Union member
   └─ Expected "footer_sendoff_id", actual "_id"`
      )
    })
  })
})
