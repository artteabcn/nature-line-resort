import React from "react";
import Image from "next/image";
import { FacebookIcon, InstagramIcon, SOCIAL_LINKS } from "@/components/SocialIcons";
import { getImageUrl } from "@/lib/content";

export default async function Footer(): Promise<React.JSX.Element> {
  const socials = [
    { href: SOCIAL_LINKS.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: SOCIAL_LINKS.instagram, label: "Instagram", Icon: InstagramIcon },
  ];
  const logoSrc = await getImageUrl("logo", "/logo.png");

  return (
    <footer className="bg-brand-charcoal py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-8">
        <Image
          src={logoSrc}
          alt="Nature Line Resort"
          width={1024}
          height={1069}
          className="h-20 w-auto rounded-xl shadow-md"
          unoptimized
        />
        <div className="flex items-center gap-4">
          {socials.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-white/50 hover:text-white"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
