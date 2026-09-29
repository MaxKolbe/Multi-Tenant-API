import app from "./app.js";
import logger from "./configs/logger.config.js";
import { connectDatabase } from "./db/db.js";
import { env } from "./configs/env.config.js";

const port = env.PORT || 3000;

(async () => {
  await connectDatabase();
})();

app.listen(port, () => {
  logger.info(`Server running on port: ${port}`);
});
