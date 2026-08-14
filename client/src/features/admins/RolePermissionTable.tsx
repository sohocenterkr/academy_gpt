import { Check, Minus } from "lucide-react";
import {
  hasPermission,
  permissionList,
  type Permission
} from "../../../../shared/permissions";

const permissionLabels: Record<Permission, string> = {
  "dashboard:view": "대시보드 조회",
  "administrators:view": "관리자 조회",
  "administrators:manage": "관리자 관리",
  "students:view": "학생·보호자 조회",
  "students:manage": "학생·보호자 관리",
  "academics:view": "학사정보 조회",
  "academics:manage": "학사정보 관리",
  "checkins:view": "등원기록 조회",
  "checkins:manage": "등원기록 관리",
  "messages:view": "문자 조회",
  "messages:manage": "문자 작성·관리",
  "messages:send": "실문자 발송",
  "card-news:view": "카드뉴스 조회",
  "card-news:manage": "카드뉴스 관리",
  "reports:view": "보고서 조회",
  "audit:view": "감사기록 조회",
  "settings:view": "설정 조회",
  "settings:manage": "설정 관리"
};

function PermissionMark({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="permission-yes" aria-label="허용">
      <Check size={17} aria-hidden="true" />
    </span>
  ) : (
    <span className="permission-no" aria-label="허용 안 함">
      <Minus size={17} aria-hidden="true" />
    </span>
  );
}

export function RolePermissionTable() {
  return (
    <>
      <div className="permission-table-wrap">
      <table className="permission-table">
        <thead>
          <tr>
            <th>권한</th>
            <th>최고관리자</th>
            <th>관리자</th>
          </tr>
        </thead>
        <tbody>
          {permissionList.map((permission) => (
            <tr key={permission}>
              <td>
                <strong>{permissionLabels[permission]}</strong>
                <small>{permission}</small>
              </td>
              <td>
                <PermissionMark
                  allowed={hasPermission(
                    "super_admin",
                    permission
                  )}
                />
              </td>
              <td>
                <PermissionMark
                  allowed={hasPermission("admin", permission)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="permission-mobile-list">
      {permissionList.map((permission) => (
        <article className="permission-mobile-card" key={permission}>
          <div>
            <strong>{permissionLabels[permission]}</strong>
            <small>{permission}</small>
          </div>

          <dl>
            <div>
              <dt>최고관리자</dt>
              <dd>
                <PermissionMark
                  allowed={hasPermission(
                    "super_admin",
                    permission
                  )}
                />
              </dd>
            </div>
            <div>
              <dt>관리자</dt>
              <dd>
                <PermissionMark
                  allowed={hasPermission("admin", permission)}
                />
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
    </>
  );
}
