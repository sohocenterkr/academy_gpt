export type AcademySettingsItem = {
  id: string;
  academyName: string;
  phone: string;
  address: string;
  logoMediaId: string | null;
  senderName: string;
  brandColors: Record<string, string>;
  brandFonts: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type AcademySettingsInput = {
  academyName: string;
  phone: string;
  address: string;
  senderName: string;
  brandColors?: Record<string, string>;
  brandFonts?: Record<string, string>;
};

async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
    };
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getAcademySettings(): Promise<
  AcademySettingsItem | null
> {
  const response = await fetch("/api/settings/academy", {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "학원 기본정보를 불러올 수 없습니다."
      )
    );
  }

  const result = (await response.json()) as {
    item: AcademySettingsItem | null;
  };

  return result.item;
}

export async function updateAcademySettings(
  input: AcademySettingsInput
): Promise<AcademySettingsItem> {
  const response = await fetch("/api/settings/academy", {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "학원 기본정보를 저장할 수 없습니다."
      )
    );
  }

  const result = (await response.json()) as {
    item: AcademySettingsItem;
  };

  return result.item;
}
