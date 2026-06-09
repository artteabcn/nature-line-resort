import React from "react";
import { getOverridesMap, applyOverrides } from "@/lib/content";
import enBase from "../../../../messages/en.json";
import frBase from "../../../../messages/fr.json";
import deBase from "../../../../messages/de.json";
import thBase from "../../../../messages/th.json";
import TextEditor, { type EditableField } from "../text/TextEditor";

const LOCALES = ["en", "fr", "de", "th"] as const;

const SECTIONS: ReadonlyArray<{ title: string; fields: ReadonlyArray<EditableField> }> = [
  {
    title: "Rooms section heading",
    fields: [
      { path: "rooms.label", label: "Section label (e.g. Accommodation)" },
      { path: "rooms.title", label: "Section title" },
      { path: "rooms.subtitle", label: "Section subtitle", multiline: true },
    ],
  },
  {
    title: "Cosy Room",
    fields: [
      { path: "rooms.items.0.name", label: "Room name" },
      { path: "rooms.items.0.description", label: "Description", multiline: true },
      { path: "rooms.items.0.beds", label: "Beds (e.g. 1 King Bed)" },
      { path: "rooms.items.0.view", label: "View (e.g. Garden & Pool View)" },
      {
        path: "rooms.items.0.price",
        label: "Starting price (marketing teaser — real rates come from Smoobu)",
      },
    ],
  },
  {
    title: "Deluxe Room",
    fields: [
      { path: "rooms.items.1.name", label: "Room name" },
      { path: "rooms.items.1.description", label: "Description", multiline: true },
      { path: "rooms.items.1.beds", label: "Beds (e.g. 1 King Bed)" },
      { path: "rooms.items.1.view", label: "View (e.g. Garden & Pool View)" },
      {
        path: "rooms.items.1.price",
        label: "Starting price (marketing teaser — real rates come from Smoobu)",
      },
    ],
  },
  {
    title: "Family Room",
    fields: [
      { path: "rooms.items.2.name", label: "Room name" },
      { path: "rooms.items.2.description", label: "Description", multiline: true },
      { path: "rooms.items.2.beds", label: "Beds (e.g. 1 King + 1 Single Bed)" },
      { path: "rooms.items.2.view", label: "View (e.g. Garden & Pool View)" },
      {
        path: "rooms.items.2.price",
        label: "Starting price (marketing teaser — real rates come from Smoobu)",
      },
    ],
  },
  {
    title: "Room features (shown next to the room card)",
    fields: [
      { path: "rooms.feature1", label: "Feature 1" },
      { path: "rooms.feature2", label: "Feature 2" },
      { path: "rooms.feature3", label: "Feature 3" },
      { path: "rooms.feature4", label: "Feature 4" },
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
  if (typeof cursor === "string") return cursor;
  if (typeof cursor === "number") return String(cursor);
  return "";
}

const BASE = { en: enBase, fr: frBase, de: deBase, th: thBase } as const;

export default async function RoomsPage(): Promise<React.JSX.Element> {
  const merged: Record<string, unknown> = {};
  await Promise.all(
    LOCALES.map(async (locale) => {
      const overrides = await getOverridesMap(locale);
      merged[locale] = applyOverrides(BASE[locale], overrides);
    })
  );

  const sections = SECTIONS.map((section) => ({
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
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Rooms</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        Real-time nightly rates come from Smoobu. The starting price here is the marketing teaser
        shown on the homepage card.
      </p>
      <TextEditor sections={sections} locales={LOCALES as unknown as string[]} />
    </div>
  );
}
