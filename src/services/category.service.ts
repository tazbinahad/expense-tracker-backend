import { Category } from "../models/Category";
import {
  ICreateCategoryInput,
  IDeleteCategoryInput,
  IGetCategoryInput,
  IUpdateCategoryInput,
} from "../schemas/category.schema";
import { ConflictError, NotFoundError } from "../utils/error.utils";

export const createCategoryService = async (data: ICreateCategoryInput) => {
  try {
    const existingCategory = await Category.findOne({
      categoryName: data.categoryName,
      memberId: data.memberId,
      type: data.type,
    });
    if (existingCategory) {
      throw new ConflictError("Category already exists");
    }

    const category = await Category.create({
      memberId: data.memberId,
      categoryName: data.categoryName,
      type: data.type,
    });

    return category;
  } catch (error) {
    throw error;
  }
};

export const updateCategoryService = async (
  id: IUpdateCategoryInput["params"]["id"],
  data: IUpdateCategoryInput["body"]
) => {
  try {
    const category = await Category.findByIdAndUpdate(id, data, { new: true });
    if (!category) {
      throw new NotFoundError("Category not found");
    }
    return category;
  } catch (error) {
    throw error;
  }
};

export const deleteCategoryService = async (
  id: IDeleteCategoryInput["params"]["id"]
) => {
  try {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      throw new NotFoundError("Category not found");
    }
    return category;
  } catch (error) {
    throw error;
  }
};

export const getAllCategoriesService = async () => {
  try {
    const categories = await Category.find();
    return categories;
  } catch (error) {
    throw error;
  }
};

export const getCategoryService = async (
  id: IGetCategoryInput["params"]["id"]
) => {
  try {
    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError("Category not found");
    }
    return category;
  } catch (error) {
    throw error;
  }
};
