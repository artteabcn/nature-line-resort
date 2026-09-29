"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContactSchema, type ContactInput } from "@/lib/validations/contact";
import { FacebookIcon, InstagramIcon, SOCIAL_LINKS } from "@/components/SocialIcons";
import { SITE } from "@/config/site";
import { useState } from "react";

export default function ContactSection(): React.JSX.Element {
  const t = useTranslations("contact");
  const tf = useTranslations("contact.form");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(ContactSchema),
  });

  async function onSubmit(data: ContactInput): Promise<void> {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  }

  const contactItems = [
    { icon: MapPin, label: t("address") },
    ...(SITE.phone.display
      ? [{ icon: Phone, label: SITE.phone.display, href: `tel:${SITE.phone.e164}` }]
      : []),
    { icon: Mail, label: t("email"), href: `mailto:${t("email")}` },
  ];
  const hasWhatsApp = SITE.phone.waMe.length > 0;

  return (
    <section id="contact" className="bg-brand-cream py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center">
          <p className="section-label">{t("label")}</p>
          <h2 className="section-title mt-5">{t("title")}</h2>
          <p className="section-subtitle mx-auto">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-2">
          {/* Contact info */}
          <div className="flex flex-col gap-5">
            {contactItems.map(({ icon: Icon, label, href }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <Icon className="text-brand-pink size-5" />
                </div>
                {href ? (
                  <a
                    href={href}
                    className="hover:text-brand-pink text-brand-ink mt-1 transition-colors duration-200"
                  >
                    {label}
                  </a>
                ) : (
                  <p className="text-brand-ink mt-1">{label}</p>
                )}
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3">
              {hasWhatsApp && (
                <a
                  href={`https://wa.me/${SITE.phone.waMe}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <MessageCircle className="size-5" />
                  {t("whatsapp")}
                </a>
              )}
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="border-brand-pink/25 text-brand-pink hover:bg-brand-pink flex h-12 w-12 items-center justify-center rounded-full border transition-[background-color,color,transform] duration-200 ease-out hover:text-white active:scale-95"
              >
                <FacebookIcon className="h-5 w-5" />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="border-brand-pink/25 text-brand-pink hover:bg-brand-pink flex h-12 w-12 items-center justify-center rounded-full border transition-[background-color,color,transform] duration-200 ease-out hover:text-white active:scale-95"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            </div>

            <div className="bg-brand-blush h-72 overflow-hidden rounded-[1.25rem] ring-1 ring-black/5">
              <iframe
                src="https://maps.google.com/maps?q=9.2120239,99.8636077&z=16&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Nature Line Resort location"
              />
            </div>
          </div>

          {/* Contact form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div>
              <input
                {...register("name")}
                placeholder={tf("name")}
                className={cn(
                  "focus:border-brand-pink w-full rounded-xl border bg-white px-4 py-3 text-sm transition-colors outline-none",
                  errors.name ? "border-red-400" : "border-gray-200"
                )}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <input
                {...register("email")}
                type="email"
                placeholder={tf("email")}
                className={cn(
                  "focus:border-brand-pink w-full rounded-xl border bg-white px-4 py-3 text-sm transition-colors outline-none",
                  errors.email ? "border-red-400" : "border-gray-200"
                )}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <input
                {...register("phone")}
                placeholder={tf("phone")}
                className="focus:border-brand-pink w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-colors outline-none"
              />
            </div>

            <div>
              <textarea
                {...register("message")}
                rows={5}
                placeholder={tf("message")}
                className={cn(
                  "focus:border-brand-pink w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm transition-colors outline-none",
                  errors.message ? "border-red-400" : "border-gray-200"
                )}
              />
              {errors.message && (
                <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
              )}
            </div>

            {status === "success" && (
              <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-200">
                {tf("success")}
              </p>
            )}
            {status === "error" && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                {tf("error")}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-pill-primary mt-2 disabled:opacity-60"
            >
              {isSubmitting ? tf("sending") : tf("submit")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
