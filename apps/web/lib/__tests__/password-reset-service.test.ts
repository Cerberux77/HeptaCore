import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcryptjs";
import {
  consumePasswordResetToken,
  issuePasswordResetForUser,
  PasswordResetError,
  requestPasswordReset,
} from "../password-reset-service";

function createFakeDb() {
  const users = [
    { id: "u1", email: "jean@test.com", passwordHash: null },
    { id: "u2", email: "mvera", passwordHash: null },
  ] as Array<{ id: string; email: string; passwordHash: string | null }>;
  const tokens: Array<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    consumedAt: Date | null;
  }> = [];

  return {
    users,
    tokens,
    user: {
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) return users.find((user) => user.id === where.id) ?? null;
        if (where.email) return users.find((user) => user.email === where.email) ?? null;
        return null;
      },
      update: async ({ where, data }: { where: { id: string }; data: { passwordHash: string } }) => {
        const user = users.find((item) => item.id === where.id);
        if (!user) throw new Error("user not found");
        user.passwordHash = data.passwordHash;
        return user;
      },
    },
    passwordResetToken: {
      updateMany: async ({ where, data }: { where: { userId: string; consumedAt: null }; data: { consumedAt: Date } }) => {
        let count = 0;
        for (const token of tokens) {
          if (token.userId === where.userId && token.consumedAt === null) {
            token.consumedAt = data.consumedAt;
            count++;
          }
        }
        return { count };
      },
      create: async ({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date } }) => {
        const record = {
          id: `prt_${tokens.length + 1}`,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          consumedAt: null,
        };
        tokens.push(record);
        return record;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) => {
        const token = tokens.find((item) => item.tokenHash === where.tokenHash);
        if (!token) return null;
        return {
          ...token,
          user: { id: token.userId },
        };
      },
      update: async ({ where, data }: { where: { id: string }; data: { consumedAt: Date } }) => {
        const token = tokens.find((item) => item.id === where.id);
        if (!token) throw new Error("token not found");
        token.consumedAt = data.consumedAt;
        return token;
      },
    },
  };
}

describe("password reset service", () => {
  it("does not reveal whether the account exists", async () => {
    const db = createFakeDb();
    const result = await requestPasswordReset({ email: "missing@test.com" }, db as never);
    assert.deepEqual(result, { ok: true, token: null });
  });

  it("creates a reset token for an existing user", async () => {
    const db = createFakeDb();
    const result = await requestPasswordReset({ email: "jean@test.com" }, db as never);
    assert.equal(result.ok, true);
    assert.ok(result.token);
    assert.equal(db.tokens.length, 1);
  });

  it("rejects mismatched passwords", async () => {
    const db = createFakeDb();
    const token = await issuePasswordResetForUser("u1", db as never);
    await assert.rejects(
      () => consumePasswordResetToken({ token, password: "securePass123", confirmPassword: "differentPass123" }, db as never),
      (error: unknown) => error instanceof PasswordResetError && error.code === "INVALID_REQUEST",
    );
  });

  it("enforces one-time use", async () => {
    const db = createFakeDb();
    const token = await issuePasswordResetForUser("u1", db as never);
    const first = await consumePasswordResetToken({ token, password: "securePass123", confirmPassword: "securePass123" }, db as never);
    assert.equal(first.ok, true);

    await assert.rejects(
      () => consumePasswordResetToken({ token, password: "securePass456", confirmPassword: "securePass456" }, db as never),
      (error: unknown) => error instanceof PasswordResetError && error.code === "INVALID_TOKEN",
    );
  });

  it("rejects expired reset tokens", async () => {
    const db = createFakeDb();
    const token = await issuePasswordResetForUser("u1", db as never, -1000);
    await assert.rejects(
      () => consumePasswordResetToken({ token, password: "securePass123", confirmPassword: "securePass123" }, db as never),
      (error: unknown) => error instanceof PasswordResetError && error.code === "INVALID_TOKEN",
    );
  });

  it("hashes the new password server-side", async () => {
    const db = createFakeDb();
    const token = await issuePasswordResetForUser("u1", db as never);
    await consumePasswordResetToken({ token, password: "securePass123", confirmPassword: "securePass123" }, db as never);
    assert.ok(db.users[0].passwordHash);
    assert.equal(await bcrypt.compare("securePass123", db.users[0].passwordHash as string), true);
  });

  it("resets a legacy identifier and the stored hash matches immediately", async () => {
    const db = createFakeDb();
    const token = await issuePasswordResetForUser("u2", db as never);
    const result = await consumePasswordResetToken({
      token,
      password: "Mvera2026test",
      confirmPassword: "Mvera2026test",
    }, db as never);

    assert.equal(result.ok, true);
    assert.ok(db.users[1].passwordHash);
    assert.equal(await bcrypt.compare("Mvera2026test", db.users[1].passwordHash as string), true);
  });
});
