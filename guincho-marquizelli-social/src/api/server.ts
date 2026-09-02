import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { createApp } from "./app.js";

const { app } = createApp();
app.listen(config.PORT, () => logger.info({ port: config.PORT, mode: config.APP_ENV, realPublishing: config.ENABLE_REAL_PUBLISHING, instagramLoginMode: config.INSTAGRAM_LOGIN_MODE }, "API iniciada"));
