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
  const category = await createCategoryService({
    ...req.body,
    memberId: req.user!._id.toString(),
  });
  sendResponse(res, 201, category, "Category created successfully");
});

export const updateCategoryController = asyncHandler(async (req, res) => {
  const { id } = req.params as IUpdateCategoryInput["params"];

  const category = await updateCategoryService(
    id,
    req.user!._id.toString(),
    req.body,
  );
  sendResponse(res, 200, category, "Category updated successfully");
});

export const deleteCategoryController = asyncHandler(async (req, res) => {
  const { id } = req.params as IDeleteCategoryInput["params"];

  const category = await deleteCategoryService(id, req.user!._id.toString());
  sendResponse(res, 200, category, "Category deleted successfully");
});

export const getAllCategoriesController = asyncHandler(async (req, res) => {
  const categories = await getAllCategoriesService(req.user!._id.toString());
  sendResponse(res, 200, categories, "Categories fetched successfully");
});

export const getCategoryController = asyncHandler(async (req, res) => {
  const { id } = req.params as IGetCategoryInput["params"];
  const category = await getCategoryService(id, req.user!._id.toString());
  sendResponse(res, 200, category, "Category fetched successfully");
});
