import { z } from "zod";

/**
 * Category management input. Names and slugs are trimmed and stored in their
 * canonical form; the database remains the source of truth for what exists, so
 * no category value is ever hardcoded in the admin UI.
 */
export const categoryNameSchema = z
  .string()
  .trim()
  .min(2, "Give this category a name of at least 2 characters.")
  .max(80, "Keep the name to 80 characters or fewer.");

export const categorySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Give this category a URL slug of at least 2 characters.")
  .max(80, "Keep the slug to 80 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens only (for example, vehicle-parts).",
  );

const optionalParentId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().uuid("Choose a valid parent category.").nullable(),
);

const optionalDescription = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .max(300, "Keep the description to 300 characters or fewer.")
    .nullable(),
);

export const categoryFormSchema = z.object({
  name: categoryNameSchema,
  slug: categorySlugSchema,
  description: optionalDescription,
  parent_id: optionalParentId,
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const categoryUpdateSchema = categoryFormSchema.extend({
  id: z.string().uuid("That category could not be identified."),
});

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export const categoryIdSchema = z.object({
  category_id: z.string().uuid("That category could not be identified."),
});

export const categoryActiveSchema = categoryIdSchema.extend({
  is_active: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
});

export const categoryReorderSchema = categoryIdSchema.extend({
  direction: z.enum(["up", "down"]),
});

export type CategoryReorderInput = z.infer<typeof categoryReorderSchema>;
