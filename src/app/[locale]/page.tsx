import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Nav from "@/components/Nav";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import RoomsSection from "@/components/RoomsSection";
import AmenitiesSection from "@/components/AmenitiesSection";
import GalleryGrid from "@/components/GalleryGrid";
import TestimonialsSection from "@/components/TestimonialsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { SITE, SITE_URL, alternateLanguages, localePath } from "@/config/site";
import { getImageUrl } from "@/lib/content";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const title = t("home.title");
  const description = t("home.description");
  const url = localePath(locale);

  return {
    title,
    description,
    keywords: t("keywords"),
    alternates: {
      canonical: url,
      languages: alternateLanguages(),
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

function LodgingJsonLd({ locale }: { locale: string }): React.JSX.Element {
  const data = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE_URL}/#lodging`,
    name: SITE.name,
    description: "Boutique bed & breakfast in Khanom, Nakhon Si Thammarat, Thailand.",
    url: localePath(locale),
    image: [
      `${SITE_URL}${SITE.ogImage}`,
      `${SITE_URL}/images/main2.jpeg`,
      `${SITE_URL}/images/room.jpeg`,
    ],
    logo: `${SITE_URL}/logo.png`,
    email: SITE.email,
    telephone: SITE.phone.e164,
    priceRange: SITE.priceRange,
    currenciesAccepted: "THB",
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.streetAddress,
      addressLocality: SITE.address.addressLocality,
      addressRegion: SITE.address.addressRegion,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    sameAs: [SITE.social.facebook, SITE.social.instagram],
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Free WiFi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Swimming pool", value: true },
      { "@type": "LocationFeatureSpecification", name: "Breakfast included", value: true },
      { "@type": "LocationFeatureSpecification", name: "Air conditioning", value: true },
      { "@type": "LocationFeatureSpecification", name: "Parking", value: true },
    ],
    availableLanguage: ["English", "French", "German", "Thai"],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export default async function HomePage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  const logoUrl = await getImageUrl("logo", "/logo.png");
  return (
    <main>
      <LodgingJsonLd locale={locale} />
      <Nav logoUrl={logoUrl} />
      <HeroSection />
      <AboutSection />
      <RoomsSection />
      <AmenitiesSection />
      <TestimonialsSection />
      <GalleryGrid />
      <ContactSection />
      <Footer />
      <WhatsAppButton />
    </main>
  );
}
