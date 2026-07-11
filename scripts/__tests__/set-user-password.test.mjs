import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcryptjs";
import { setUserPassword } from "../set-user-password.mjs";

function createFakeDb() {
  const users = [
    {
      id: "u1",
      email: "mvera",
      platformRole: "SUPER_ADMIN",
      passwordHash: null,
    },
  ];

  return {
    users,
    user: {
      async findUnique({ where }) {
        const user = users.find((item) => item.email === where.email);
        return user
          ? {
            id: user.id,
            email: user.email,
            platformRole: user.platformRole,
            passwordHash: user.passwordHash,
          }
          : null;
      },
      async update({ where, data }) {
        const user = users.find((item) => item.id === where.id);
        if (!user) throw new Error("user not found");
        user.passwordHash = data.passwordHash;
        return {
          email: user.email,
          platformRole: user.platformRole,
          passwordHash: user.passwordHash,
        };
      },
    },
  };
}

describe("set-user-password", () => {
  it("aborts when HEPTACORE_ALLOW_PASSWORD_REPAIR is not enabled", async () => {
    const db = createFakeDb();

    await assert.rejects(
      () => setUserPassword({
        db,
        env: {
          HEPTACORE_PASSWORD_REPAIR_IDENTIFIER: "mvera",
          HEPTACORE_PASSWORD_REPAIR_PASSWORD: "Mvera2026test",
        },
        logger: () => {},
      }),
      (error) => error instanceof Error && error.message.includes("HEPTACORE_ALLOW_PASSWORD_REPAIR=1"),
    );
  });

  it("updates the hash and verifies it immediately with bcryptjs", async () => {
    const db = createFakeDb();
    const logs = [];

    const result = await setUserPassword({
      db,
      env: {
        HEPTACORE_ALLOW_PASSWORD_REPAIR: "1",
        HEPTACORE_PASSWORD_REPAIR_IDENTIFIER: "MVERA",
        HEPTACORE_PASSWORD_REPAIR_PASSWORD: "Mvera2026test",
      },
      bcryptLib: bcrypt,
      logger: (_event, payload) => logs.push(payload),
    });

    assert.equal(result.userFound, true);
    assert.equal(result.identifier, "mvera");
    assert.equal(result.platformRole, "SUPER_ADMIN");
    assert.equal(result.hasPasswordHashBefore, false);
    assert.equal(result.hasPasswordHashAfter, true);
    assert.equal(result.immediateCompareOk, true);
    assert.equal(logs.length, 1);
    assert.equal(await bcrypt.compare("Mvera2026test", db.users[0].passwordHash), true);
  });
});
