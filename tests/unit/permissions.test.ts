import { describe, expect, it } from "vitest";
import {
  getPermissionsForRole,
  hasPermission,
  permissionList
} from "../../shared/permissions";

describe("관리자 역할별 권한", () => {
  it("최고관리자는 모든 권한을 가진다", () => {
    expect(getPermissionsForRole("super_admin")).toEqual(permissionList);

    for (const permission of permissionList) {
      expect(hasPermission("super_admin", permission)).toBe(true);
    }
  });

  it("일반관리자는 운영 권한을 가진다", () => {
    expect(hasPermission("admin", "students:manage")).toBe(true);
    expect(hasPermission("admin", "checkins:manage")).toBe(true);
    expect(hasPermission("admin", "messages:send")).toBe(true);
    expect(hasPermission("admin", "card-news:manage")).toBe(true);
  });

  it("일반관리자는 최고관리자 전용 권한을 갖지 않는다", () => {
    expect(hasPermission("admin", "administrators:view")).toBe(false);
    expect(hasPermission("admin", "administrators:manage")).toBe(false);
    expect(hasPermission("admin", "audit:view")).toBe(false);
    expect(hasPermission("admin", "settings:manage")).toBe(false);
  });
});
