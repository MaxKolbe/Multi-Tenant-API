import ejs from "ejs";
import logger from "../configs/logger.config.js";
import { BrevoClient, BrevoError } from "@getbrevo/brevo";
import { env } from "../configs/env.config.js";

const brevo = new BrevoClient({ apiKey: env.BREVO_API_KEY.toString() });

export const sendEmail = async (
  to: string,
  subject: string,
  content: string,
  name: string = "Example",
) => {
  let html = await ejs.renderFile(
    process.cwd() + "/src/views/layout/template.ejs",
    { subject, title: subject, content },
    { async: true },
  );

  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent: html,
      sender: { name, email: env.BREVO_EMAIL.toString() },
      to: [{ email: to }],
    });

    logger.info("Message sent successfully", {
      messageId: result.messageId,
    });

    return result;
  } catch (err: any) {
    if (err.statusCode === 401) {
      logger.error("Invalid API key:", { recipient: to });
    } else if (err.statusCode === 429) {
      const retryAfter = err.rawResponse.headers["retry-after"];
      logger.error(`Rate limited. Retry after ${retryAfter}s`, { recipient: to });
    } else if (err instanceof BrevoError) {
      logger.error(`Brevo API error ${err.statusCode}`, {
        recipient: to,
        errorMessage: err.message,
      });
    }
  }
};

