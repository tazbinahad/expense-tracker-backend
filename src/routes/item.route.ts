import { Router } from "express";
import { getAllItemsController } from "../controllers/item.controller";

const ItemRoute = Router();

ItemRoute.get("/getAllItems", getAllItemsController);

export default ItemRoute;
