import assert from "node:assert/strict";
import test from "node:test";

import { calendarDisplayState } from "./calendar-state.ts";

test("calendar display state prefers operational state over approval status", () => {
  const visible = calendarDisplayState({
    status: "APPROVED",
    operationalState: "READY_TO_PUBLISH",
  });

  assert.equal(visible, "READY_TO_PUBLISH");
});
