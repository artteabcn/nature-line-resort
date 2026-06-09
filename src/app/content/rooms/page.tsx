import React from "react";
import { getOverridesMap, applyOverrides } from "@/lib/content";
import enBase from "../../../../messages/en.json";
import frBase from "../../../../messages/fr.json";
import deBase from "../../../../messages/de.json";
import thBase from "../../../../messages/th.json";
import TextEditor, { type EditableField } from "../text/TextEditor";
import ListEditor, { type ListField } from "../ListEditor";

const LOCALES = ["en", "fr", "de", "th"] as const;
const BASE = { en: enBase, fr: frBase, de: deBase, th: thBase } as const;

// Section headings + features stay scalar (edited via TextEditor). The room
// cards themselves are an add/delete list (1–3) edited via ListEditor.
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
    title: "Room features (shown next to each room card)",
    fields: [
      { path: "rooms.feature1", label: "Feature 1" },
      { path: "rooms.feature2", label: "Feature 2" },
      { path: "rooms.feature3", label: "Feature 3" },
      { path: "rooms.feature4", label: "Feature 4" },
    ],
  },
];

const ROOM_FIELDS: ListField[] = [
  { key: "name", label: "Room name", perLocale: true, type: "text" },
  { key: "description", label: "Description", perLocale: true, type: "textarea" },
  { key: "beds", label: "Beds (e.g. 1 King Bed)", perLocale: true, type: "text" },
  { key: "view", label: "View (e.g. Garden & Pool View)", perLocale: true, type: "text" },
  { key: "maxGuests", label: "Max guests", perLocale: false, type: "number" },
  {
    key: "price",
    label: "Starting price (marketing teaser — real rates come from Smoobu)",
    perLocale: false,
    type: "number",
  },
];

function getByPath(obj: unknown, path: string): string {
  let cursor: unknown = obj;
  for (const key of path.split(".")) {
    if (cursor == null) return "";
    if (Array.isArray(cursor)) cursor = cursor[Number(key)];
    else if (typeof cursor === "object") cursor = (cursor as Record<string, unknown>)[key];
    else return "";
  }
  if (typeof cursor === "string") return cursor;
  if (typeof cursor === "number") return String(cursor);
  return "";
}

function itemsAt(obj: unknown, path: string): Array<Record<string, unknown>> {
  let cursor: unknown = obj;
  for (const key of path.split(".")) {
    if (cursor && typeof cursor === "object") cursor = (cursor as Record<string, unknown>)[key];
    else return [];
  }
  return Array.isArray(cursor)
    ? (cursor as Array<Record<string, unknown>>).map((o) => ({ ...o }))
    : [];
}

export default async function RoomsPage(): Promise<React.JSX.Element> {
  const merged: Record<string, unknown> = {};
  const roomItems: Record<string, Array<Record<string, unknown>>> = {};
  await Promise.all(
    LOCALES.map(async (locale) => {
      const overrides = await getOverridesMap(locale);
      const m = applyOverrides(BASE[locale], overrides);
      merged[locale] = m;
      roomItems[locale] = itemsAt(m, "rooms.items");
    })
  );

  const sections = SECTIONS.map((section) => ({
    title: section.title,
    rows: section.fields.map((field) => ({
      path: field.path,
      label: field.label,
      multiline: field.multiline,
      values: Object.fromEntries(LOCALES.map((l) => [l, getByPath(merged[l], field.path)])),
    })),
  }));

  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Rooms</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        Add or remove room cards (between 1 and 3) and edit their details. Real-time nightly rates
        come from Smoobu; the starting price here is the marketing teaser on the homepage card.
      </p>

      <ListEditor
        title="Room cards"
        description="shown on the homepage"
        path="rooms.items"
        locales={LOCALES as unknown as string[]}
        fields={ROOM_FIELDS}
        initial={roomItems}
        min={1}
        max={3}
        idKey="id"
        newItemTemplate={{
          id: "room",
          name: "New Room",
          description: "",
          price: 1500,
          currency: "THB",
          maxGuests: 2,
          beds: "1 King Bed",
          view: "Garden View",
        }}
      />

      <div className="mt-10">
        <TextEditor sections={sections} locales={LOCALES as unknown as string[]} />
      </div>
    </div>
  );
}
