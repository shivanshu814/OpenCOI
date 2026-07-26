import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAdminSensitive,
  canViewFullAudit,
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

  it("gates full audit forensics to admin/owner", () => {
    assert.equal(canViewFullAudit("owner"), true);
    assert.equal(canViewFullAudit("admin"), true);
    assert.equal(canViewFullAudit("member"), false);
    assert.equal(canViewFullAudit("viewer"), false);
  });
});
