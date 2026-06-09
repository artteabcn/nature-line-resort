import React from "react";
import { getOverridesMap, applyOverrides } from "@/lib/content";
import enBase from "../../../../messages/en.json";
import frBase from "../../../../messages/fr.json";
import deBase from "../../../../messages/de.json";
import thBase from "../../../../messages/th.json";
import ListEditor, { type ListField } from "../ListEditor";
import { FACILITY_ICONS } from "@/lib/facility-icons";

const LOCALES = ["en", "fr", "de", "th"] as const;
const BASE = { en: enBase, fr: frBase, de: deBase, th: thBase } as const;

const FIELDS: ListField[] = [
  { key: "icon", label: "Icon", perLocale: false, type: "iconSelect", options: FACILITY_ICONS },
  { key: "title", label: "Name", perLocale: true, type: "text" },
  { key: "desc", label: "Description", perLocale: true, type: "textarea" },
];

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

export default async function FacilitiesPage(): Promise<React.JSX.Element> {
  const initial: Record<string, Array<Record<string, unknown>>> = {};
  await Promise.all(
    LOCALES.map(async (locale) => {
      const overrides = await getOverridesMap(locale);
      const merged = applyOverrides(BASE[locale], overrides);
      initial[locale] = itemsAt(merged, "amenities.items");
    })
  );

  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Facilities</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        The facilities shown on the homepage (pool, breakfast, parking…). Add the ones this property
        offers, remove the ones it doesn&apos;t. Pick an icon and give each a name and short
        description in every language.
      </p>
      <ListEditor
        title="Facilities offered"
        path="amenities.items"
        locales={LOCALES as unknown as string[]}
        fields={FIELDS}
        initial={initial}
        min={1}
        max={12}
        newItemTemplate={{ icon: "pool", title: "", desc: "" }}
      />
    </div>
  );
}
