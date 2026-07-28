import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is missing');
}

await mongoose.connect(process.env.MONGO_URI, { family: 4 });

const categories = await mongoose.connection.db
  .collection('categories')
  .aggregate([
    {
      $project: {
        categoryName: 1,
        type: 1,
        memberIdType: { $type: '$memberId' },
        categoryNameType: { $type: '$categoryName' },
        typeValueType: { $type: '$type' },
        createdAtType: { $type: '$createdAt' },
        updatedAtType: { $type: '$updatedAt' },
        validType: { $in: ['$type', ['income', 'expense']] },
      },
    },
    { $sort: { validType: 1, categoryName: 1 } },
  ])
  .toArray();

const byType = categories.reduce((summary, category) => {
  const key = String(category.type ?? '<missing>');
  summary[key] = (summary[key] ?? 0) + 1;
  return summary;
}, {});

console.log(
  JSON.stringify(
    {
      total: categories.length,
      byType,
      timestampShapes: categories.map(
        ({ createdAtType, updatedAtType }) => ({
          createdAtType,
          updatedAtType,
        }),
      ),
      invalid: categories.filter(
        (category) =>
          !category.validType ||
          category.categoryNameType !== 'string' ||
          category.memberIdType !== 'objectId',
      ),
    },
    null,
    2,
  ),
);

await mongoose.disconnect();
