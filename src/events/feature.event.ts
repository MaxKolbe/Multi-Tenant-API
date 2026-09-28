import logger from "../configs/logger.config.js";
import ejs from "ejs";
// import { sendEmail } from "../utils/sendEmail.util.js";
import { appEvents } from "../lib/events.js";

// DEFINE EVENT NAMES AS CONSTANTS
export const FEATURE_EVENTS = {
  FEATURE_ACTION: "feature:action",
  /**
   * ..other event names
   */
} as const;

appEvents.on(FEATURE_EVENTS.FEATURE_ACTION, async (data) => {
  try {
    logger.info("success", { data });
  } catch (err) {
    logger.error("failure", { data });
  }
});

// SEND EMAIL
// appEvents.on(FEATURE_EVENTS.FEATURE_ACTION, async (data) => {
//   try {
//     let content = await ejs.renderFile(
//       process.cwd() + "/src/views/emails/----.ejs",
//       {},
//       { async: true },
//     );

//     const info = await sendEmail(data.email, "", content);

//     if (!info) {
//       throw new Error();
//     }

//     logger.info("email sent successully", {
//       correlationId: data.correlationId
//     });
//   } catch (error: any) {
//     logger.error("Failed to send email", {
//       email: data.email,
//       message: error.message,
//       correlationId: data.correlationId
//     });
//   }
// });
