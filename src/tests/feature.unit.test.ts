import { clearTables, installExtensions } from "./helpers/setup.js";
import { describe, it, expect, beforeEach } from "vitest";
import db from "../db/db.js";

describe("example-feature-unit-test", () => {
  //   beforeEach(() => {
  //     await clearTables();
  //     await installExtensions();
  //   });

  it("should return true", async () => {
    const result = await db.execute("SELECT 1");
  
    expect(result.command).toBe("SELECT");
  });
});
