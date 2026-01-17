import {
  ICreateCategoryInput,
  IDeleteCategoryInput,
  IGetCategoryInput,
  IUpdateCategoryInput,
} from "../schemas/category.schema";
import {
  createCategoryService,
  deleteCategoryService,
  getAllCategoriesService,
  getCategoryService,
  updateCategoryService,
} from "../services/category.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

export const createCategoryController = asyncHandler(async (req, res) => {
  const category = await createCategoryService(req.body);
  sendResponse(res, 201, category, "Category created successfully");
});

export const updateCategoryController = asyncHandler(async (req, res) => {
  const { id } = req.params as IUpdateCategoryInput["params"];

  await updateCategoryService(id, req.body);
  sendResponse(res, 200, null, "Category updated successfully");
});

export const deleteCategoryController = asyncHandler(async (req, res) => {
  const { id } = req.params as IDeleteCategoryInput["params"];

  await deleteCategoryService(id);
  sendResponse(res, 200, null, "Category deleted successfully");
});

export const getAllCategoriesController = asyncHandler(async (req, res) => {
  const categories = await getAllCategoriesService();
  sendResponse(res, 200, categories, "Categories fetched successfully");
});

export const getCategoryController = asyncHandler(async (req, res) => {
  const { id } = req.params as IGetCategoryInput["params"];
  const category = await getCategoryService(id);
  sendResponse(res, 200, category, "Category fetched successfully");
});
