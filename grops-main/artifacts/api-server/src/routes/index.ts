import { Router, type IRouter } from "express";
import healthRouter from "./health";
import graphsRouter from "./graphs";
import waitlistRouter from "./waitlist";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(graphsRouter);
router.use(waitlistRouter);
router.use(adminRouter);

export default router;
