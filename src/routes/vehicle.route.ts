import { Router } from "express";
import {
  createVehicleController,
  createVehicleLogController,
  deleteVehicleLogController,
  getAllVehiclesController,
  getVehicleLogsController,
} from "../controllers/vehicle.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createVehicleLogSchema,
  createVehicleSchema,
  vehicleIdSchema,
  vehicleLogIdSchema,
} from "../schemas/vehicle.schema";

const VehicleRoute = Router();

VehicleRoute.get("/getAllVehicles", getAllVehiclesController);
VehicleRoute.post(
  "/createVehicle",
  validate(createVehicleSchema),
  createVehicleController,
);
VehicleRoute.get(
  "/:vehicleId/logs",
  validate(vehicleIdSchema),
  getVehicleLogsController,
);
VehicleRoute.post(
  "/:vehicleId/logs",
  validate(createVehicleLogSchema),
  createVehicleLogController,
);
VehicleRoute.delete(
  "/logs/:logId",
  validate(vehicleLogIdSchema),
  deleteVehicleLogController,
);

export default VehicleRoute;
