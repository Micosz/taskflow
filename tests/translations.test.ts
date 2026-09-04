import { describe, expect, it } from "vitest";

import {
  interpolate,
  translations,
} from "@/i18n/translations";

function flattenMessages(
  messages: object,
  prefix = "",
): Array<[string, string]> {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[path, value] as [string, string]]
      : flattenMessages(value as object, path);
  });
}

describe("translation catalogs", () => {
  it("keeps English and Thai dictionary keys in sync", () => {
    const englishKeys = flattenMessages(translations.en)
      .map(([key]) => key)
      .sort();
    const thaiKeys = flattenMessages(translations.th)
      .map(([key]) => key)
      .sort();

    expect(thaiKeys).toEqual(englishKeys);
  });

  it.each(["en", "th"] as const)(
    "contains no blank user-facing messages in %s",
    (locale) => {
      const blankMessages = flattenMessages(translations[locale]).filter(
        ([, value]) => value.trim().length === 0,
      );

      expect(blankMessages).toEqual([]);
    },
  );

  it.each(["en", "th"] as const)(
    "includes auth, migration, dialog, validation, toast, and empty-state copy in %s",
    (locale) => {
      const messages = translations[locale];

      expect(Object.values(messages.auth).every(Boolean)).toBe(true);
      expect(Object.values(messages.migration).every(Boolean)).toBe(true);
      expect(Object.values(messages.deleteDialog).every(Boolean)).toBe(true);
      expect(Object.values(messages.validation).every(Boolean)).toBe(true);
      expect(Object.values(messages.toast).every(Boolean)).toBe(true);
      expect(Object.values(messages.empty).every(Boolean)).toBe(true);
    },
  );

  it("interpolates variables while retaining unknown placeholders", () => {
    expect(interpolate("{count} tasks for {title}", { count: 3, title: "CS263" })).toBe(
      "3 tasks for CS263",
    );
    expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
  });
});
