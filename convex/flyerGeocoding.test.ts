/// <reference types="vite/client" />
import { test, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { censusAddressMatches, findAddress } from "./flyerGeocoding";
const modules = import.meta.glob("./**/*.ts");
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const valid = { matchedAddress: "2665 MISSION ST, SAN FRANCISCO, CA", coordinates: { x: -122.418, y: 37.755 } };
test("geocoding accepts only finite SF results and rejects incomplete responses", () => {
  expect(censusAddressMatches({ result: { addressMatches: [valid, null, { ...valid, coordinates: { x: 0, y: 0 } }, { ...valid, coordinates: { x: -122.4, y: NaN } }, { matchedAddress: "Missing point" }] } }))
    .toEqual([{ label: valid.matchedAddress, latitude: 37.755, longitude: -122.418 }]);
  expect(() => censusAddressMatches({})).toThrow("invalid response");
});
test("address lookup is moderator protected before making any external request", async () => {
  vi.stubEnv("SCENESHIFT_MODERATOR_TOKEN", "test-reviewer");
  const request = vi.fn(); vi.stubGlobal("fetch", request);
  const t = convexTest(schema, modules);
  await expect(t.action(api.flyerReview.lookupAddress, { moderatorToken: "wrong", address: "2665 Mission St" })).rejects.toThrow("Moderator access denied");
  expect(request).not.toHaveBeenCalled();
});
test("lookup returns actual matches without automatically approving or saving an event", async () => {
  vi.stubEnv("SCENESHIFT_MODERATOR_TOKEN", "test-reviewer");
  const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { addressMatches: [valid] } })));
  vi.stubGlobal("fetch", request);
  const t = convexTest(schema, modules);
  expect(await t.action(api.flyerReview.lookupAddress, { moderatorToken: "test-reviewer", address: "2665 Mission St" }))
    .toEqual([{ label: valid.matchedAddress, latitude: 37.755, longitude: -122.418 }]);
  const url = new URL(request.mock.calls[0][0]);
  expect(url.searchParams.get("address")).toBe("2665 Mission St, San Francisco, CA");
  expect(await t.run(ctx => ctx.db.query("events").take(1))).toEqual([]);
});
test("no match stays unresolved and provider failures offer a map fallback", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { addressMatches: [] } }))));
  expect(await findAddress("2nd St between Market and Howard")).toEqual([]);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failed")));
  await expect(findAddress("2665 Mission St")).rejects.toThrow("place the pin on the map");
  await expect(findAddress("")).rejects.toThrow("Enter a street address");
});
