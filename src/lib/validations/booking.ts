import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const BookingSchema = z
  .object({
    roomId: z.string().min(1),
    checkIn: z.string().regex(ISO_DATE, "Check-in must be YYYY-MM-DD"),
    checkOut: z.string().regex(ISO_DATE, "Check-out must be YYYY-MM-DD"),
    guests: z.coerce.number().int().min(1).max(10).default(1),
    guestName: z.string().min(2, "Name must be at least 2 characters"),
    guestEmail: z.string().email("Invalid email address"),
    guestPhone: z.string().min(6, "Phone number is required"),
    notes: z.string().optional(),
    locale: z.string().min(2).max(5).default("en"),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type BookingInput = z.infer<typeof BookingSchema>;
