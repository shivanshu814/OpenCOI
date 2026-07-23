import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAdminSensitive,
  canWriteOrgData,
  productRoleLabel,
  toProductRole,
} from "./roles";

describe("G1 roles", () => {
  it("maps DB roles to product labels", () => {
    assert.equal(toProductRole("owner"), "admin");
    assert.equal(toProductRole("admin"), "admin");
    assert.equal(toProductRole("member"), "manager");
    assert.equal(toProductRole("viewer"), "readonly");
    assert.equal(productRoleLabel("manager"), "Manager");
  });

  it("gates sensitive vs write", () => {
    assert.equal(canAdminSensitive("owner"), true);
    assert.equal(canAdminSensitive("member"), false);
    assert.equal(canWriteOrgData("viewer"), false);
    assert.equal(canWriteOrgData("member"), true);
  });
});
