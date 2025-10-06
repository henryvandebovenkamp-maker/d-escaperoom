// PATH: src/lib/validation.ts
import { z } from "zod";

// CUID v2 is anders; jij gebruikt Prisma default(cuid()) → v1 patroon:
export const cuidString = z.string().regex(/^c[^\s]{24}$/, "Ongeldige CUID");
