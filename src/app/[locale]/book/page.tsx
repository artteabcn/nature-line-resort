import React from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import BookingForm from "@/components/BookingForm";
import WhatsAppButton from "@/components/WhatsAppButton";
import { SITE, alternateLanguages, localePath } from "@/config/site";
import { getImageUrl } from "@/lib/content";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const title = t("book.title");
  const description = t("book.description");
  const url = localePath(locale, "book");

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: alternateLanguages("book"),
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE.name,
      title,
      description,
      locale,
      images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: t("ogAlt") }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE.ogImage],
    },
  };
}

function BookingHeader(): React.JSX.Element {
  const t = useTranslations("bookPage");
  return (
    <div className="bg-brand-cream px-8 pt-40 pb-16 text-center">
      <p className="section-label">{t("label")}</p>
      <h1 className="section-title mt-3">{t("title")}</h1>
      <p className="section-subtitle mx-auto">{t("subtitle")}</p>
    </div>
  );
}

export default async function BookPage(): Promise<React.JSX.Element> {
  const logoUrl = await getImageUrl("logo", "/logo.png");
  return (
    <main>
      <Nav logoUrl={logoUrl} />
      <BookingHeader />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-8">
          <BookingForm />
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
