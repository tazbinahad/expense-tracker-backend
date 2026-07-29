import { z } from "zod";

const id = z.string().min(3);

export const createVehicleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    make: z.string().trim().max(80).optional(),
    modelName: z.string().trim().max(80).optional(),
    registrationNumber: z.string().trim().max(40).optional(),
  }),
});

const logBase = z.object({
  accountId: id,
  date: z.coerce.date(),
  odometerKm: z.number().min(0),
  totalCost: z.number().positive(),
  notes: z.string().trim().max(500).optional(),
});

export const createVehicleLogSchema = z.object({
  params: z.object({ vehicleId: id }),
  body: z.discriminatedUnion("type", [
    logBase.extend({
      type: z.literal("fuel"),
      fuelLiters: z.number().positive(),
      fullTank: z.boolean().default(true),
    }),
    logBase
      .extend({
        type: z.literal("service"),
        serviceName: z.string().trim().min(2).max(100),
        nextServiceOdometerKm: z.number().min(0).optional(),
      })
      .refine(
        (value) =>
          value.nextServiceOdometerKm === undefined ||
          value.nextServiceOdometerKm >= value.odometerKm,
        {
          message: "Next service odometer cannot be below current odometer",
          path: ["nextServiceOdometerKm"],
        },
      ),
  ]),
});

export const vehicleIdSchema = z.object({
  params: z.object({ vehicleId: id }),
});

export const vehicleLogIdSchema = z.object({
  params: z.object({ logId: id }),
});

export type CreateVehicleInput = z.infer<
  typeof createVehicleSchema
>["body"];
export type CreateVehicleLogInput = z.infer<
  typeof createVehicleLogSchema
>["body"];
