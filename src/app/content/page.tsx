import React from "react";
import Link from "next/link";
import { FileText, BedDouble, ImageIcon, ExternalLink, ConciergeBell } from "lucide-react";

const CARDS = [
  {
    href: "/content/text",
    icon: FileText,
    title: "Text",
    description: "Hero, About, Amenities, Contact and other site copy. Editable per language.",
  },
  {
    href: "/content/rooms",
    icon: BedDouble,
    title: "Rooms",
    description: "Room name, description and starting price. Editable per language.",
  },
  {
    href: "/content/media",
    icon: ImageIcon,
    title: "Media",
    description: "Logo, hero image, room photo, gallery. Upload, replace or remove.",
  },
  {
    href: "/content/services",
    icon: ConciergeBell,
    title: "Services",
    description: "Paid extras — laundry, airport transfer, etc. Add, edit or remove prices.",
  },
];

export default function ContentDashboard(): React.JSX.Element {
  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Content</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        Edits land on the live site within seconds — no rebuild, no deploy.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="hover:border-brand-pink/30 group block rounded-2xl border border-black/5 bg-white p-6 transition-colors"
          >
            <div className="bg-brand-blush text-brand-pink flex size-10 items-center justify-center rounded-xl">
              <Icon className="size-5" />
            </div>
            <h2 className="text-brand-ink mt-4 font-serif text-xl font-semibold">{title}</h2>
            <p className="text-brand-ink-soft mt-2 text-sm leading-6">{description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-brand-ink font-serif text-lg font-semibold">Live site</h2>
        <p className="text-brand-ink-soft mt-2 text-sm">
          Open the public site in another tab to verify edits as you make them.
        </p>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-pink hover:text-brand-pink-dark mt-3 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          Open public site <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
