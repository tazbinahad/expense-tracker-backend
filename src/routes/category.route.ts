import { Router } from "express";
import {
  createCategoryController,
  deleteCategoryController,
  getAllCategoriesController,
  getCategoryController,
  updateCategoryController,
} from "../controllers/category.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createCategorySchema,
  deleteCategorySchema,
  getCategorySchema,
  updateCategorySchema,
} from "../schemas/category.schema";

const CategoryRoute = Router();

CategoryRoute.post(
  "/createCategory",
  validate(createCategorySchema),
  createCategoryController
);

CategoryRoute.put(
  "/updateCategory/:id",
  validate(updateCategorySchema),
  updateCategoryController
);

CategoryRoute.delete(
  "/deleteCategory/:id",
  validate(deleteCategorySchema),
  deleteCategoryController
);

CategoryRoute.get("/getAllCategories", getAllCategoriesController);

CategoryRoute.get(
  "/getCategory/:id",
  validate(getCategorySchema),
  getCategoryController
);

export default CategoryRoute;
