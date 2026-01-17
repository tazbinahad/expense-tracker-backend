import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    memberId: z.string().min(3, "Member ID must be at least 3 characters long"),
    categoryName: z
      .string()
      .min(3, "Category name must be at least 3 characters long"),
    type: z.enum(["income", "expense"]),
  }),
});

export type ICreateCategoryInput = z.infer<typeof createCategorySchema>["body"];

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(3, "Category ID must be at least 3 characters long"),
  }),
  body: z.object({
    categoryName: z
      .string()
      .min(3, "Category name must be at least 3 characters long")
      .optional(),
    type: z.enum(["income", "expense"]).optional(),
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
