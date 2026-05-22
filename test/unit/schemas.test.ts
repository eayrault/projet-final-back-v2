import { describe, expect, it } from "vitest";
import { EventCreateSchema, EventUpdateSchema } from "../../src/models/Events.js";
import { UserLoginSchema, UserRegisterSchema } from "../../src/models/User.js";

// ─── UserRegisterSchema ───────────────────────────────────────────────────────

describe("UserRegisterSchema", () => {
  const validUser = {
    username: "johndoe",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    password: "secret123",
  };

  it("accepte un body valide", () => {
    const result = UserRegisterSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it("rejette un username trop court (moins de 3 caractères)", () => {
    const result = UserRegisterSchema.safeParse({ ...validUser, username: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejette un email mal formé", () => {
    const result = UserRegisterSchema.safeParse({ ...validUser, email: "pas-un-email" });
    expect(result.success).toBe(false);
  });

  it("rejette un email absent", () => {
    const { email, ...withoutEmail } = validUser;
    const result = UserRegisterSchema.safeParse(withoutEmail);
    expect(result.success).toBe(false);
  });

  it("rejette un password trop court (moins de 6 caractères)", () => {
    const result = UserRegisterSchema.safeParse({ ...validUser, password: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejette un password absent", () => {
    const { password, ...withoutPassword } = validUser;
    const result = UserRegisterSchema.safeParse(withoutPassword);
    expect(result.success).toBe(false);
  });

  it("rejette un first_name vide", () => {
    const result = UserRegisterSchema.safeParse({ ...validUser, first_name: "" });
    expect(result.success).toBe(false);
  });
});

// ─── UserLoginSchema ──────────────────────────────────────────────────────────

describe("UserLoginSchema", () => {
  const validLogin = {
    email: "john@example.com",
    password: "secret123",
  };

  it("accepte un body valide", () => {
    const result = UserLoginSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
  });

  it("rejette un email mal formé", () => {
    const result = UserLoginSchema.safeParse({ ...validLogin, email: "bademail" });
    expect(result.success).toBe(false);
  });

  it("rejette un password trop court", () => {
    const result = UserLoginSchema.safeParse({ ...validLogin, password: "abc" });
    expect(result.success).toBe(false);
  });
});

// ─── EventCreateSchema ────────────────────────────────────────────────────────

describe("EventCreateSchema", () => {
  const validEvent = {
    name: "LAN Party 2025",
    description: "Un grand événement",
    start_date: "2025-06-01T10:00:00Z",
    end_date: "2025-06-02T20:00:00Z",
  };

  it("accepte un body valide", () => {
    const result = EventCreateSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("accepte un body sans description (champ optionnel)", () => {
    const { description, ...withoutDesc } = validEvent;
    const result = EventCreateSchema.safeParse(withoutDesc);
    expect(result.success).toBe(true);
  });

  it("rejette un name vide", () => {
    const result = EventCreateSchema.safeParse({ ...validEvent, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejette une start_date absente", () => {
    const { start_date, ...withoutStart } = validEvent;
    const result = EventCreateSchema.safeParse(withoutStart);
    expect(result.success).toBe(false);
  });

  it("rejette une date dans un format invalide", () => {
    const result = EventCreateSchema.safeParse({ ...validEvent, start_date: "pas-une-date" });
    expect(result.success).toBe(false);
  });
});

// ─── EventUpdateSchema ────────────────────────────────────────────────────────

describe("EventUpdateSchema", () => {
  it("accepte un body vide (tous les champs sont optionnels)", () => {
    const result = EventUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepte une mise à jour partielle avec seulement le name", () => {
    const result = EventUpdateSchema.safeParse({ name: "Nouveau nom" });
    expect(result.success).toBe(true);
  });

  it("rejette un name vide si fourni", () => {
    const result = EventUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});
