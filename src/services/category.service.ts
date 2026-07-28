import { Category } from "../models/Category";
import { Expense } from "../models/Expense";
import { Income } from "../models/Income";
import { Bill } from "../models/Bill";
import {
  ICreateCategoryInput,
  IDeleteCategoryInput,
  IGetCategoryInput,
  IUpdateCategoryInput,
} from "../schemas/category.schema";
import { ConflictError, NotFoundError } from "../utils/error.utils";
import { ensureMemberDefaults } from "./bootstrap.service";

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const createCategoryService = async (data: ICreateCategoryInput) => {
  try {
    const existingCategory = await Category.findOne({
      categoryName: data.categoryName,
      memberId: data.memberId,
      type: data.type,
    }).collation({ locale: "en", strength: 2 });
    if (existingCategory) {
      throw new ConflictError("Category already exists");
    }

    const category = await Category.create({
      memberId: data.memberId,
      categoryName: data.categoryName,
      type: data.type,
      slug: slugify(data.categoryName),
      icon: data.icon || "CircleDollarSign",
      color: data.color || (data.type === "income" ? "#0F766E" : "#64748B"),
      isSystem: false,
    });

    return category;
  } catch (error) {
    throw error;
  }
};

export const updateCategoryService = async (
  id: IUpdateCategoryInput["params"]["id"],
  memberId: string,
  data: IUpdateCategoryInput["body"]
) => {
  try {
    const existing = await Category.findOne({ _id: id, memberId });
    if (!existing) {
      throw new NotFoundError("Category not found");
    }
    if (
      existing.isSystem &&
      ((data.categoryName && data.categoryName !== existing.categoryName) ||
        (data.type && data.type !== existing.type))
    ) {
      throw new ConflictError("Default category names and types cannot be changed");
    }

    if (data.type && data.type !== existing.type) {
      const isReferenced =
        existing.type === "income"
          ? await Income.exists({ memberId, categoryId: id })
          : await Expense.exists({ memberId, categoryId: id });
      if (isReferenced) {
        throw new ConflictError(
          "Category type cannot change while transactions use it",
        );
      }
    }

    if (data.categoryName || data.type) {
      const duplicate = await Category.findOne({
        _id: { $ne: id },
        memberId,
        categoryName: data.categoryName || existing.categoryName,
        type: data.type || existing.type,
      }).collation({ locale: "en", strength: 2 });
      if (duplicate) {
        throw new ConflictError("Category already exists");
      }
    }

    const update = {
      ...data,
      ...(data.categoryName ? { slug: slugify(data.categoryName) } : {}),
    };
    const category = await Category.findOneAndUpdate({ _id: id, memberId }, update, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      throw new NotFoundError("Category not found");
    }
    return category;
  } catch (error) {
    throw error;
  }
};

export const deleteCategoryService = async (
  id: IDeleteCategoryInput["params"]["id"],
  memberId: string,
) => {
  try {
    const category = await Category.findOne({ _id: id, memberId });
    if (!category) {
      throw new NotFoundError("Category not found");
    }
    if (category.isSystem) {
      throw new ConflictError("Default categories cannot be deleted");
    }

    const isReferenced =
      category.type === "income"
        ? await Income.exists({ memberId, categoryId: id })
        : (await Expense.exists({ memberId, categoryId: id })) ||
          (await Bill.exists({ memberId, categoryId: id }));
    if (isReferenced) {
      throw new ConflictError(
        "Category has transaction history and cannot be deleted",
      );
    }

    await category.deleteOne();
    return category;
  } catch (error) {
    throw error;
  }
};

export const getAllCategoriesService = async (memberId: string) => {
  try {
    await ensureMemberDefaults(memberId);
    const categories = await Category.find({ memberId }).sort({ type: -1, sortOrder: 1, categoryName: 1 });
    return categories;
  } catch (error) {
    throw error;
  }
};

export const getCategoryService = async (
  id: IGetCategoryInput["params"]["id"],
  memberId: string,
) => {
  try {
    const category = await Category.findOne({ _id: id, memberId });
    if (!category) {
      throw new NotFoundError("Category not found");
    }
    return category;
  } catch (error) {
    throw error;
  }
};
