import {
  createVehicleLogService,
  createVehicleService,
  deleteVehicleLogService,
  getAllVehiclesService,
  getVehicleLogsService,
} from "../services/vehicle.service";
import { asyncHandler } from "../utils/core.utils";
import { sendResponse } from "../utils/response.utils";

const memberId = (req: Express.Request) => req.user!._id.toString();

export const createVehicleController = asyncHandler(async (req, res) => {
  sendResponse(
    res,
    201,
    await createVehicleService(memberId(req), req.body),
    "Vehicle created successfully",
  );
});

export const getAllVehiclesController = asyncHandler(async (req, res) => {
  sendResponse(
    res,
    200,
    await getAllVehiclesService(memberId(req)),
    "Vehicles fetched successfully",
  );
});

export const getVehicleLogsController = asyncHandler(async (req, res) => {
  sendResponse(
    res,
    200,
    await getVehicleLogsService(memberId(req), req.params.vehicleId!),
    "Vehicle logs fetched successfully",
  );
});

export const createVehicleLogController = asyncHandler(async (req, res) => {
  sendResponse(
    res,
    201,
    await createVehicleLogService(
      memberId(req),
      req.params.vehicleId!,
      req.body,
    ),
    "Vehicle expense recorded successfully",
  );
});

export const deleteVehicleLogController = asyncHandler(async (req, res) => {
  sendResponse(
    res,
    200,
    await deleteVehicleLogService(memberId(req), req.params.logId!),
    "Vehicle log deleted successfully",
  );
});
