import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const AvailabilitySchema = z
  .object({
    arrival: z.string().regex(ISO_DATE, "Arrival must be YYYY-MM-DD"),
    departure: z.string().regex(ISO_DATE, "Departure must be YYYY-MM-DD"),
    adults: z.coerce.number().int().min(1).max(10).default(2),
    children: z.coerce.number().int().min(0).max(10).default(0),
  })
  .refine((data) => data.departure > data.arrival, {
    message: "Departure must be after arrival",
    path: ["departure"],
  });

export type AvailabilityInput = z.infer<typeof AvailabilitySchema>;
