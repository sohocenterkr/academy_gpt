export type SchoolItem = {
  id: string;
  name: string;
  region: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GradeLevelItem = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SchoolInput = {
  name: string;
  region?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type GradeLevelInput = {
  name: string;
  sortOrder: number;
  isActive: boolean;
};

async function requestJson<T>(
  url: string,
  options: RequestInit,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    let message = fallbackMessage;

    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };
      message = body.error?.message ?? message;
    } catch {
      // JSON이 아닌 오류 응답은 기본 메시지를 사용합니다.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function getSchools(
  includeInactive = true
): Promise<SchoolItem[]> {
  const result = await requestJson<{ items: SchoolItem[] }>(
    `/api/schools?includeInactive=${String(includeInactive)}`,
    { method: "GET" },
    "학교 목록을 불러올 수 없습니다."
  );

  return result.items;
}

export async function createSchool(
  input: SchoolInput
): Promise<SchoolItem> {
  const result = await requestJson<{ item: SchoolItem }>(
    "/api/schools",
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    "학교를 등록할 수 없습니다."
  );

  return result.item;
}

export async function updateSchool(
  id: string,
  input: Partial<SchoolInput>
): Promise<SchoolItem> {
  const result = await requestJson<{ item: SchoolItem }>(
    `/api/schools/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    },
    "학교 정보를 수정할 수 없습니다."
  );

  return result.item;
}

export async function getGradeLevels(
  includeInactive = true
): Promise<GradeLevelItem[]> {
  const result = await requestJson<{ items: GradeLevelItem[] }>(
    `/api/grade-levels?includeInactive=${String(includeInactive)}`,
    { method: "GET" },
    "학년 목록을 불러올 수 없습니다."
  );

  return result.items;
}

export async function createGradeLevel(
  input: GradeLevelInput
): Promise<GradeLevelItem> {
  const result = await requestJson<{ item: GradeLevelItem }>(
    "/api/grade-levels",
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    "학년을 등록할 수 없습니다."
  );

  return result.item;
}

export async function updateGradeLevel(
  id: string,
  input: Partial<GradeLevelInput>
): Promise<GradeLevelItem> {
  const result = await requestJson<{ item: GradeLevelItem }>(
    `/api/grade-levels/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    },
    "학년 정보를 수정할 수 없습니다."
  );

  return result.item;
}
