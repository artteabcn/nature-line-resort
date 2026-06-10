import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const PaymentIntentSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
    roomId: z.string().min(1),
    beds24RoomId: z.coerce.number().int().positive(),
    checkIn: z.string().regex(ISO_DATE),
    checkOut: z.string().regex(ISO_DATE),
    adults: z.coerce.number().int().min(1).max(10),
    children: z.coerce.number().int().min(0).max(10).default(0),
    locale: z.string().min(2).max(5).default("en"),
    notes: z.string().optional(),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type PaymentIntentInput = z.infer<typeof PaymentIntentSchema>;
