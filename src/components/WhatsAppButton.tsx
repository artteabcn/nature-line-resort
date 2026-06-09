import React from "react";
import { MessageCircle } from "lucide-react";
import { SITE } from "@/config/site";

export default function WhatsAppButton(): React.JSX.Element {
  return (
    <a
      href={`https://wa.me/${SITE.phone.waMe}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg ring-4 ring-white/40 transition-transform hover:scale-110"
    >
      <MessageCircle className="size-7 text-white" />
    </a>
  );
}
