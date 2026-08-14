import { describe, expect, it } from "vitest";
import {
  cleanOptionalRegion,
  cleanReferenceName,
  gradeLevelCreateSchema,
  normalizeReferenceName,
  schoolCreateSchema
} from "../../shared/validators/academics";
import {
  academySettingsUpdateSchema,
  isValidKoreanPhone,
  normalizePhone
} from "../../shared/validators/academy-settings";

describe("학교·학년 입력 검증", () => {
  it("이름의 앞뒤·반복 공백과 대소문자를 정규화한다", () => {
    expect(cleanReferenceName("  서울   초등학교  ")).toBe(
      "서울 초등학교"
    );
    expect(normalizeReferenceName("  ABC   School ")).toBe(
      "abc school"
    );
  });

  it("빈 학교명과 음수 정렬값을 거부한다", () => {
    expect(
      schoolCreateSchema.safeParse({
        name: "   ",
        sortOrder: 0
      }).success
    ).toBe(false);

    expect(
      schoolCreateSchema.safeParse({
        name: "서울초등학교",
        sortOrder: -1
      }).success
    ).toBe(false);
  });

  it("학년의 기본 활성 상태와 정렬값을 설정한다", () => {
    const result = gradeLevelCreateSchema.parse({
      name: "초등 1학년"
    });

    expect(result.sortOrder).toBe(0);
    expect(result.isActive).toBe(true);
  });

  it("빈 지역값은 null로 정리한다", () => {
    expect(cleanOptionalRegion("   ")).toBeNull();
  });
});

describe("학원 기본정보 입력 검증", () => {
  it("전화번호에서 숫자만 저장한다", () => {
    expect(normalizePhone("02-1234-5678")).toBe("0212345678");
    expect(normalizePhone("010 1234 5678")).toBe("01012345678");
  });

  it("국내 전화번호 형식을 검사한다", () => {
    expect(isValidKoreanPhone("02-1234-5678")).toBe(true);
    expect(isValidKoreanPhone("010-1234-5678")).toBe(true);
    expect(isValidKoreanPhone("1234")).toBe(false);
  });

  it("빈 수정 요청을 거부한다", () => {
    expect(
      academySettingsUpdateSchema.safeParse({}).success
    ).toBe(false);
  });
});
