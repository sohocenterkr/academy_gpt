import { useState, type FormEvent } from "react";
import type {
  AcademySettingsInput,
  AcademySettingsItem
} from "./academy-api";

type AcademySettingsFormProps = {
  settings: AcademySettingsItem | null;
  canManage: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  savedMessage: string | null;
  onSubmit: (input: AcademySettingsInput) => void;
};

export function AcademySettingsForm({
  settings,
  canManage,
  isSaving,
  errorMessage,
  savedMessage,
  onSubmit
}: AcademySettingsFormProps) {
  const [academyName, setAcademyName] = useState(
    settings?.academyName ?? ""
  );
  const [phone, setPhone] = useState(settings?.phone ?? "");
  const [address, setAddress] = useState(settings?.address ?? "");
  const [senderName, setSenderName] = useState(
    settings?.senderName ?? ""
  );
  const [primaryColor, setPrimaryColor] = useState(
    settings?.brandColors.primary ?? "#2563eb"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    settings?.brandColors.secondary ?? "#0f172a"
  );
  const [headingFont, setHeadingFont] = useState(
    settings?.brandFonts.heading ?? "Pretendard"
  );
  const [bodyFont, setBodyFont] = useState(
    settings?.brandFonts.body ?? "Pretendard"
  );
  const [localError, setLocalError] = useState<string | null>(null);

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !academyName.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !senderName.trim()
    ) {
      setLocalError(
        "학원명, 대표 전화번호, 주소, 기본 발신자명을 모두 입력해 주세요."
      );
      return;
    }

    setLocalError(null);
    onSubmit({
      academyName,
      phone,
      address,
      senderName,
      brandColors: {
        ...settings?.brandColors,
        primary: primaryColor,
        secondary: secondaryColor
      },
      brandFonts: {
        ...settings?.brandFonts,
        heading: headingFont,
        body: bodyFont
      }
    });
  }

  return (
    <form className="academy-settings-form" onSubmit={submitForm}>
      {!canManage ? (
        <div className="read-only-notice">
          일반 관리자는 학원 기본정보를 조회만 할 수 있습니다.
        </div>
      ) : null}

      <section className="settings-form-section">
        <div className="settings-form-heading">
          <h2>기본정보</h2>
          <p>학원 운영과 발신 정보에 사용되는 기본값입니다.</p>
        </div>

        <div className="settings-form-grid">
          <label className="field">
            <span>학원명</span>
            <input
              value={academyName}
              onChange={(event) => setAcademyName(event.target.value)}
              maxLength={150}
              placeholder="학원명을 입력해 주세요"
              disabled={!canManage || isSaving}
            />
          </label>

          <label className="field">
            <span>대표 전화번호</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={30}
              placeholder="02-1234-5678"
              disabled={!canManage || isSaving}
            />
          </label>

          <label className="field settings-full-field">
            <span>주소</span>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="학원 주소를 입력해 주세요"
              disabled={!canManage || isSaving}
            />
          </label>

          <label className="field">
            <span>기본 발신자명</span>
            <input
              value={senderName}
              onChange={(event) => setSenderName(event.target.value)}
              maxLength={100}
              placeholder="문자 발신자명"
              disabled={!canManage || isSaving}
            />
          </label>
        </div>
      </section>

      <section className="settings-form-section">
        <div className="settings-form-heading">
          <h2>브랜드 설정</h2>
          <p>카드뉴스와 안내 화면에 사용할 기본 스타일입니다.</p>
        </div>

        <div className="settings-form-grid">
          <label className="field">
            <span>기본 색상</span>
            <div className="color-input-row">
              <input
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                disabled={!canManage || isSaving}
              />
              <input
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                maxLength={100}
                disabled={!canManage || isSaving}
              />
            </div>
          </label>

          <label className="field">
            <span>보조 색상</span>
            <div className="color-input-row">
              <input
                type="color"
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
                disabled={!canManage || isSaving}
              />
              <input
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
                maxLength={100}
                disabled={!canManage || isSaving}
              />
            </div>
          </label>

          <label className="field">
            <span>제목 글꼴</span>
            <input
              value={headingFont}
              onChange={(event) => setHeadingFont(event.target.value)}
              maxLength={100}
              disabled={!canManage || isSaving}
            />
          </label>

          <label className="field">
            <span>본문 글꼴</span>
            <input
              value={bodyFont}
              onChange={(event) => setBodyFont(event.target.value)}
              maxLength={100}
              disabled={!canManage || isSaving}
            />
          </label>
        </div>
      </section>

      <section className="settings-form-section logo-settings">
        <div className="settings-form-heading">
          <h2>학원 로고</h2>
          <p>
            로고 업로드는 Cloudinary 직접 업로드 기능과 함께 연결됩니다.
          </p>
        </div>
        <div className="pending-feature">
          현재 단계에서는 기존 로고 식별자만 안전하게 보존합니다.
        </div>
      </section>

      {localError || errorMessage ? (
        <div className="form-error" role="alert">
          {localError || errorMessage}
        </div>
      ) : null}

      {savedMessage ? (
        <div className="form-success" role="status">
          {savedMessage}
        </div>
      ) : null}

      {canManage ? (
        <div className="settings-save-actions">
          <button
            type="submit"
            className="button button-primary"
            disabled={isSaving}
          >
            {isSaving ? "저장 중" : "학원 기본정보 저장"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
