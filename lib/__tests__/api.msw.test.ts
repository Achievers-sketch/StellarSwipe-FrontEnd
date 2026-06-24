/**
 * Tests for lib/api.ts using MSW to intercept real fetch calls.
 * Demonstrates the MSW setup pattern: import server, override per-test for error cases.
 *
 * Adding MSW to a new test file:
 *   1. Import { server } from '@/src/mocks/server'
 *   2. server.use(...) inside a test to override the default handler
 *   3. Lifecycle (listen/reset/close) is handled by src/mocks/jest.setup.ts
 */

import { http, HttpResponse } from "msw";
import { server } from "@/src/mocks/server";
import { fetchSignals, NetworkError, ServerError } from "@/lib/api";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchSignals – MSW integration", () => {
  it("returns signals array from the mocked /api/signals endpoint", async () => {
    const signals = await fetchSignals();
    expect(Array.isArray(signals)).toBe(true);
  });

  it("throws ServerError when the endpoint responds with 500", async () => {
    server.use(
      http.get("/api/signals", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    await expect(fetchSignals()).rejects.toThrow(ServerError);
  });

  it("throws NetworkError when fetch itself fails (network down)", async () => {
    server.use(
      http.get("/api/signals", () => HttpResponse.error())
    );

    await expect(fetchSignals()).rejects.toThrow(NetworkError);
  });

  it("throws ServerError with correct status code on 404", async () => {
    server.use(
      http.get("/api/signals", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );

    const err = await fetchSignals().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).status).toBe(404);
  });
});
