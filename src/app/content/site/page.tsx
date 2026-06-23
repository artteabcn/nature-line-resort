import React from "react";
import { getAllSiteConfig } from "@/lib/content";
import SiteConfigEditor, { type SiteField } from "./SiteConfigEditor";

const FIELDS: ReadonlyArray<SiteField> = [
  {
    key: "facebookUrl",
    label: "Facebook URL",
    placeholder: "https://www.facebook.com/yourpage",
  },
  {
    key: "instagramUrl",
    label: "Instagram URL",
    placeholder: "https://www.instagram.com/yourpage/",
  },
  {
    key: "mapEmbedUrl",
    label: "Google Maps Embed URL",
    hint: "Google Maps \u2192 Share \u2192 Embed a map \u2192 copy the src= value from the iframe code",
    placeholder: "https://www.google.com/maps/embed?pb=...",
  },
  {
    key: "googlePlaceId",
    label: "Google Place ID",
    hint: "Find your Place ID at developers.google.com/maps/documentation/places/web-service/place-id",
    placeholder: "ChIJxxxxxxxxxxxxxxxx",
  },
];

export default async function SiteConfigPage(): Promise<React.JSX.Element> {
  const rows = await getAllSiteConfig();
  const initial = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Site Settings</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        Social media links, map pin, and Google Place ID. Changes go live immediately \u2014 no rebuild.
      </p>
      <SiteConfigEditor fields={FIELDS as SiteField[]} initial={initial} />
    </div>
  );
}
