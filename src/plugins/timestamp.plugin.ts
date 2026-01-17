import { Schema } from "mongoose";

export const timestampPlugin = (schema: Schema) => {
  // Add fields to the schema
  schema.add({
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: null },
  });

  // Disable default timestamps since we are handling it manually
  schema.set("timestamps", false);

  // Middleware to update 'updatedAt' on save (updates)
  schema.pre("save", function () {
    if (!this.isNew) {
      this.set("updatedAt", new Date());
    }
  });

  // Middleware to update 'updatedAt' on findOneAndUpdate, etc.
  schema.pre(
    ["findOneAndUpdate", "updateOne", "updateMany"] as any,
    function () {
      this.set({ updatedAt: new Date() });
    }
  );
};
