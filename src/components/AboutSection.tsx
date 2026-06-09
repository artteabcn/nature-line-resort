import React from "react";
import { useTranslations } from "next-intl";
import AboutCarousel from "./AboutCarousel";

export default function AboutSection(): React.JSX.Element {
  const t = useTranslations("about");

  const stats = [
    { value: t("stat1Value"), label: t("stat1Label") },
    { value: t("stat2Value"), label: t("stat2Label") },
    { value: t("stat3Value"), label: t("stat3Label") },
  ];

  return (
    <section id="about" className="bg-brand-cream py-20">
      <div className="mx-auto max-w-7xl px-8">
        <div className="grid gap-20 lg:grid-cols-2 lg:items-center">
          <AboutCarousel />

          <div>
            <p className="section-label">{t("label")}</p>
            <h2 className="section-title mt-3">{t("title")}</h2>
            <p className="text-brand-ink-soft mt-8 text-base leading-8">{t("p1")}</p>
            <p className="text-brand-ink-soft mt-4 text-base leading-8">{t("p2")}</p>

            <div className="divide-brand-teal-light mt-14 grid grid-cols-3 divide-x">
              {stats.map(({ value, label }) => (
                <div key={label} className="px-6 first:pl-0">
                  <p className="text-brand-teal font-serif text-4xl font-semibold">{value}</p>
                  <p className="text-brand-ink-soft mt-2 text-[10px] font-medium tracking-wider uppercase">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
