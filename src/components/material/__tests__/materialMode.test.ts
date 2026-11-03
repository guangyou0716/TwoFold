import { resolveMaterialMode } from "../materialMode";

describe("resolveMaterialMode (L2 glass fallback matrix)", () => {
  test("iOS + native glass available + transparency allowed → native", () => {
    expect(
      resolveMaterialMode({ platform: "ios", nativeGlassAvailable: true, reduceTransparency: false })
    ).toBe("native");
  });

  test("iOS + native available but reduce-transparency → opaque", () => {
    expect(
      resolveMaterialMode({ platform: "ios", nativeGlassAvailable: true, reduceTransparency: true })
    ).toBe("opaque");
  });

  test("Android → blur (no native glass)", () => {
    expect(
      resolveMaterialMode({ platform: "android", nativeGlassAvailable: false, reduceTransparency: false })
    ).toBe("blur");
  });

  test("Android with reduce-transparency → opaque", () => {
    expect(
      resolveMaterialMode({ platform: "android", nativeGlassAvailable: false, reduceTransparency: true })
    ).toBe("opaque");
  });

  test("web / unknown platform → blur", () => {
    expect(
      resolveMaterialMode({ platform: "web", nativeGlassAvailable: true, reduceTransparency: false })
    ).toBe("blur");
  });

  test("older iOS without the native API → blur", () => {
    expect(
      resolveMaterialMode({ platform: "ios", nativeGlassAvailable: false, reduceTransparency: false })
    ).toBe("blur");
  });
});