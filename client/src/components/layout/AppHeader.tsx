import { GraduationCap, LogOut } from "lucide-react";
import { Link } from "wouter";
import type { PublicAdmin } from "../../features/auth/api";

type AppHeaderProps = {
  admin?: PublicAdmin;
  isLoggingOut?: boolean;
  onLogout?: () => void;
};

export function AppHeader({
  admin,
  isLoggingOut = false,
  onLogout
}: AppHeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" aria-label="Academy-Gpt 홈">
          <span className="brand-icon" aria-hidden="true">
            <GraduationCap size={22} />
          </span>
          <span>Academy-Gpt</span>
        </Link>

        {admin && onLogout ? (
          <div className="header-account">
            <span className="header-account-name">
              <strong>{admin.name}</strong>
              <small>
                {admin.role === "super_admin" ? "최고관리자" : "관리자"}
              </small>
            </span>
            <button
              type="button"
              className="button button-secondary"
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              <LogOut size={18} aria-hidden="true" />
              {isLoggingOut ? "로그아웃 중" : "로그아웃"}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
