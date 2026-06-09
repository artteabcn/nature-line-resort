import React from "react";
import { getOverridesMap, applyOverrides } from "@/lib/content";
import enBase from "../../../../messages/en.json";
import frBase from "../../../../messages/fr.json";
import deBase from "../../../../messages/de.json";
import thBase from "../../../../messages/th.json";
import TextEditor, { type EditableField } from "./TextEditor";

const LOCALES = ["en", "fr", "de", "th"] as const;

// Sections + dot-paths into messages.* that the admin UI exposes for editing.
// Adding a new path here makes it editable site-wide; no other code changes
// needed.
const SECTIONS: ReadonlyArray<{ title: string; fields: ReadonlyArray<EditableField> }> = [
  {
    title: "Hero",
    fields: [
      { path: "hero.tagline", label: "Tagline" },
      { path: "hero.headline", label: "Headline" },
      { path: "hero.subheadline", label: "Subheadline", multiline: true },
      { path: "hero.cta", label: "CTA button" },
    ],
  },
  {
    title: "About",
    fields: [
      { path: "about.label", label: "Section label" },
      { path: "about.title", label: "Section title" },
      { path: "about.p1", label: "Paragraph 1", multiline: true },
      { path: "about.p2", label: "Paragraph 2", multiline: true },
      { path: "about.stat1Value", label: "Stat 1 value" },
      { path: "about.stat1Label", label: "Stat 1 label" },
      { path: "about.stat2Value", label: "Stat 2 value" },
      { path: "about.stat2Label", label: "Stat 2 label" },
      { path: "about.stat3Value", label: "Stat 3 value" },
      { path: "about.stat3Label", label: "Stat 3 label" },
    ],
  },
  {
    title: "Amenities",
    fields: [
      { path: "amenities.label", label: "Section label" },
      { path: "amenities.title", label: "Section title" },
      { path: "amenities.subtitle", label: "Section subtitle", multiline: true },
    ],
  },
  {
    title: "Gallery",
    fields: [
      { path: "gallery.label", label: "Section label" },
      { path: "gallery.title", label: "Section title" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { path: "contact.label", label: "Section label" },
      { path: "contact.title", label: "Section title" },
      { path: "contact.subtitle", label: "Section subtitle", multiline: true },
      { path: "contact.address", label: "Address" },
      { path: "contact.phone", label: "Phone (display)" },
      { path: "contact.email", label: "Email (display)" },
    ],
  },
];

function getByPath(obj: unknown, path: string): string {
  const keys = path.split(".");
  let cursor: unknown = obj;
  for (const key of keys) {
    if (cursor == null) return "";
    if (Array.isArray(cursor)) {
      cursor = cursor[Number(key)];
    } else if (typeof cursor === "object") {
      cursor = (cursor as Record<string, unknown>)[key];
    } else {
      return "";
    }
  }
  return typeof cursor === "string" ? cursor : "";
}

interface FieldRow {
  path: string;
  label: string;
  multiline?: boolean;
  values: Record<string, string>;
}

interface SectionData {
  title: string;
  rows: FieldRow[];
}

const BASE = { en: enBase, fr: frBase, de: deBase, th: thBase } as const;

export default async function TextPage(): Promise<React.JSX.Element> {
  // Load merged (overrides applied) messages for each locale so the editor
  // starts populated with whatever is currently live.
  const merged: Record<string, unknown> = {};
  await Promise.all(
    LOCALES.map(async (locale) => {
      const overrides = await getOverridesMap(locale);
      merged[locale] = applyOverrides(BASE[locale], overrides);
    })
  );

  const sections: SectionData[] = SECTIONS.map((section) => ({
    title: section.title,
    rows: section.fields.map((field) => ({
      path: field.path,
      label: field.label,
      multiline: field.multiline,
      values: Object.fromEntries(
        LOCALES.map((locale) => [locale, getByPath(merged[locale], field.path)])
      ),
    })),
  }));

  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Text</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        Edits replace the shipped default in D1. Leave a field unchanged and we won't touch it.
        Clear a field and save to restore the default.
      </p>
      <TextEditor sections={sections} locales={LOCALES as unknown as string[]} />
    </div>
  );
}
