import React from "react";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { FacebookIcon, InstagramIcon, SOCIAL_LINKS } from "@/components/SocialIcons";
import { getImageUrl } from "@/lib/content";
import { SITE } from "@/config/site";

export default async function Footer(): Promise<React.JSX.Element> {
  const [t, tHero, locale, logoSrc] = await Promise.all([
    getTranslations("nav"),
    getTranslations("hero"),
    getLocale(),
    getImageUrl("logo", "/logo.png"),
  ]);
  const socials = [
    { href: SOCIAL_LINKS.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: SOCIAL_LINKS.instagram, label: "Instagram", Icon: InstagramIcon },
  ];
  const links = [
    { href: `/${locale}#about`, label: t("about") },
    { href: `/${locale}#rooms`, label: t("rooms") },
    { href: `/${locale}#amenities`, label: t("amenities") },
    { href: `/${locale}#gallery`, label: t("gallery") },
    { href: `/${locale}#contact`, label: t("contact") },
  ];

  return (
    <footer className="bg-brand-charcoal text-white">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-10 sm:px-8">
        <div className="grid gap-12 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="font-serif text-4xl leading-[1.05] font-light tracking-tight text-balance md:text-6xl">
              {tHero("tagline")}
            </p>
            <a href={`/${locale}/book`} className="btn-pill-light mt-8">
              {tHero("cta")}
            </a>
          </div>
          <nav className="flex flex-wrap gap-x-7 gap-y-3 md:col-span-5 md:justify-end">
            {links.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-[11px] font-semibold tracking-[0.2em] text-white/70 uppercase transition-colors duration-200 hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src={logoSrc}
              alt={SITE.name}
              width={1024}
              height={1069}
              className="size-12 rounded-full bg-white object-contain p-0.5"
              unoptimized
            />
            <p className="text-xs leading-relaxed text-white/60">
              © {new Date().getFullYear()} {SITE.name}
              <br />
              {tHero("location")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex size-11 items-center justify-center rounded-full border border-white/20 text-white/70 transition-[border-color,color,transform] duration-200 ease-out hover:border-white/60 hover:text-white active:scale-95"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
