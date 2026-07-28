import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    categoryName: z
      .string()
      .trim()
      .min(3, "Category name must be at least 3 characters long"),
    type: z.enum(["income", "expense"]),
    icon: z.string().trim().min(2).max(40).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
});

export type ICreateCategoryInput = z.infer<typeof createCategorySchema>["body"] & {
  memberId: string;
};

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(3, "Category ID must be at least 3 characters long"),
  }),
  body: z.object({
    categoryName: z
      .string()
      .trim()
      .min(3, "Category name must be at least 3 characters long")
      .optional(),
    type: z.enum(["income", "expense"]).optional(),
    icon: z.string().trim().min(2).max(40).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
});

export type IUpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const deleteCategorySchema = z.object({
  params: z.object({
    id: z.string().min(3, "Category ID must be at least 3 characters long"),
  }),
});

export type IDeleteCategoryInput = z.infer<typeof deleteCategorySchema>;

export const getCategorySchema = z.object({
  params: z.object({
    id: z.string().min(3, "Category ID must be at least 3 characters long"),
  }),
});

export type IGetCategoryInput = z.infer<typeof getCategorySchema>;
