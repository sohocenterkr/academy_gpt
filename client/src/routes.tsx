import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  GraduationCap,
  LogIn,
  MessageSquareText,
  Newspaper,
  Users
} from "lucide-react";
import { Link, Route, Switch } from "wouter";

type HealthResponse = {
  status: string;
  service: string;
  timezone: string;
  timestamp: string;
};

async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error("서버 상태를 확인할 수 없습니다.");
  }

  return response.json() as Promise<HealthResponse>;
}

function Header() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" aria-label="Academy-Gpt 홈">
          <span className="brand-icon" aria-hidden="true">
            <GraduationCap size={22} />
          </span>
          <span>Academy-Gpt</span>
        </Link>

        <Link href="/login" className="button button-secondary">
          <LogIn size={18} />
          관리자 로그인
        </Link>
      </div>
    </header>
  );
}

function DashboardPage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth
  });

  return (
    <div className="app-shell">
      <Header />

      <main className="page">
        <div className="page-stack">
          <section className="content-card hero">
            <p className="eyebrow">학원 업무자동화</p>
            <h1>학생 관리부터 문자와 카드뉴스까지 한곳에서</h1>
            <p className="hero-description">
              현재 프로젝트 기반 구성이 완료되었습니다. 다음 단계에서 관리자
              인증과 데이터베이스를 연결합니다.
            </p>

            <div
              className={[
                "health-status",
                health.isError ? "is-error" : "",
                health.isSuccess ? "is-success" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              role="status"
            >
              <Activity size={18} aria-hidden="true" />
              {health.isPending && "서버 연결 확인 중"}
              {health.isSuccess && "개발 서버 정상 연결"}
              {health.isError && "개발 서버 연결 실패"}
            </div>
          </section>

          <section className="content-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">구현 예정 기능</p>
                <h2>주요 업무</h2>
              </div>
            </div>

            <div className="feature-grid">
              <article className="feature-item">
                <Users size={22} aria-hidden="true" />
                <h3>학생·보호자</h3>
                <p>학생 정보와 보호자 관계, 수신 동의를 관리합니다.</p>
              </article>

              <article className="feature-item">
                <GraduationCap size={22} aria-hidden="true" />
                <h3>등원 관리</h3>
                <p>전화번호 뒤 4자리로 빠르게 등원을 기록합니다.</p>
              </article>

              <article className="feature-item">
                <MessageSquareText size={22} aria-hidden="true" />
                <h3>대량문자</h3>
                <p>대상 검토 후 개인화 문자를 예약 발송합니다.</p>
              </article>

              <article className="feature-item">
                <Newspaper size={22} aria-hidden="true" />
                <h3>카드뉴스</h3>
                <p>사진과 사연으로 홍보용 카드뉴스를 제작합니다.</p>
              </article>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="app-shell">
      <Header />

      <main className="page page-narrow">
        <section className="content-card">
          <p className="eyebrow">관리자 전용</p>
          <h1 className="form-title">로그인</h1>
          <p className="form-description">
            로그인 기능은 데이터베이스·인증 단계에서 연결됩니다.
          </p>

          <form className="form-stack" onSubmit={(event) => event.preventDefault()}>
            <label className="field">
              <span>이메일</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="admin@example.com"
                disabled
              />
            </label>

            <label className="field">
              <span>비밀번호</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="비밀번호"
                disabled
              />
            </label>

            <button className="button button-primary button-full" disabled>
              인증 기능 준비 중
            </button>
          </form>

          <Link href="/" className="text-link">
            홈으로 돌아가기
          </Link>
        </section>
      </main>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="app-shell">
      <Header />
      <main className="page page-narrow">
        <section className="content-card empty-state">
          <h1>페이지를 찾을 수 없습니다</h1>
          <p>주소를 확인하거나 홈으로 이동해 주세요.</p>
          <Link href="/" className="button button-primary">
            홈으로 이동
          </Link>
        </section>
      </main>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/login" component={LoginPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
