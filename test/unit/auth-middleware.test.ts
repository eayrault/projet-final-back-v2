import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/db/db.js", () => ({
  default: vi.fn(),
}));

import sql from "../../src/db/db.js";
import { authenticate, requireRole } from "../../src/plugins/auth.js";

process.env.JWT_SECRET = "test-secret-key-for-unit-tests";

const sqlMock = sql as unknown as ReturnType<typeof vi.fn>;

function makeRequest(cookies: Record<string, string> = {}) {
  return { cookies, currentUser: undefined as unknown };
}

function makeReply() {
  const reply = {
    _status: 0,
    _body: undefined as unknown,
    status(code: number) { reply._status = code; return reply; },
    send(body: unknown) { reply._body = body; return reply; },
  };
  return reply;
}

describe("authenticate", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("retourne 401 si aucun cookie refreshToken n'est present", async () => {
    const req = makeRequest({});
    const reply = makeReply();
    await authenticate(req as never, reply as never);
    expect(reply._status).toBe(401);
    expect((reply._body as { message: string }).message).toMatch(/no token/i);
  });

  it("retourne 401 si le token est invalide (non trouve en base)", async () => {
    sqlMock.mockResolvedValue([]);
    const req = makeRequest({ refreshToken: "token-invalide" });
    const reply = makeReply();
    await authenticate(req as never, reply as never);
    expect(reply._status).toBe(401);
  });

  it("peuple request.currentUser si le token est valide", async () => {
    sqlMock.mockResolvedValue([{ user_id: "abc-123", username: "johndoe", role: "user" }]);
    const req = makeRequest({ refreshToken: "token-valide" });
    const reply = makeReply();
    await authenticate(req as never, reply as never);
    expect((req.currentUser as { username: string }).username).toBe("johndoe");
    expect((req.currentUser as { role: string }).role).toBe("user");
  });
});

describe("requireRole", () => {
  it("retourne 401 si currentUser n'est pas defini", async () => {
    const req = { currentUser: undefined };
    const reply = makeReply();
    const middleware = requireRole("organizer");
    await middleware(req as never, reply as never);
    expect(reply._status).toBe(401);
  });

  it("retourne 403 si le role ne correspond pas", async () => {
    const req = { currentUser: { userId: "1", username: "test", role: "user" } };
    const reply = makeReply();
    const middleware = requireRole("organizer");
    await middleware(req as never, reply as never);
    expect(reply._status).toBe(403);
    expect((reply._body as { message: string }).message).toMatch(/forbidden/i);
  });

  it("laisse passer si le role correspond exactement", async () => {
    const req = { currentUser: { userId: "1", username: "test", role: "organizer" } };
    const reply = makeReply();
    const middleware = requireRole("organizer");
    await middleware(req as never, reply as never);
    expect(reply._status).toBe(0);
    expect(reply._body).toBeUndefined();
  });

  it("retourne 403 si admin mais organizer requis", async () => {
    const req = { currentUser: { userId: "1", username: "admin", role: "admin" } };
    const reply = makeReply();
    const middleware = requireRole("organizer");
    await middleware(req as never, reply as never);
    expect(reply._status).toBe(403);
  });

  it("laisse passer un admin si role requis est admin", async () => {
    const req = { currentUser: { userId: "1", username: "admin", role: "admin" } };
    const reply = makeReply();
    const middleware = requireRole("admin");
    await middleware(req as never, reply as never);
    expect(reply._status).toBe(0);
  });
});