const nodemailer = require("nodemailer");
const Email = require("email-templates");
const path = require("path");

const config = require("../config.json");
const { emailAdmins, admins, devMode, email: emailConfig } = config;

const templatesDir = path.resolve(__dirname, "..", "views", "email");

const emailService = {};

/**
 * Determine if we should use VPN mode (send real emails but redirect to admins)
 */
const isVpnMode = () => devMode && process.env.VPN_MODE === "true";

/**
 * Create the nodemailer transporter
 */
const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * Get admin email addresses
 * @returns {string[]}
 */
const getAdminAddresses = () => {
  const adminList = emailAdmins || admins || [];
  return adminList.map((username) => username + emailConfig.emailDomain);
};

/**
 * Format recipient info for VPN mode header
 * @param {string|string[]} originalRecipients
 * @returns {string}
 */
const formatOriginalRecipients = (originalRecipients) => {
  if (Array.isArray(originalRecipients)) {
    return originalRecipients.join(", ");
  }
  return originalRecipients;
};

/**
 * Centralised function to send emails
 * - In dev mode (no VPN): just console log the email
 * - In dev mode (VPN): send to admins with original recipient info
 * - In production: send to actual recipients
 *
 * @param {string} templateName - The name of the email template folder
 * @param {object} templateData - Data for the email template
 * @param {object} mailOptions - Nodemailer mail options (to, subject, priority)
 * @returns {Promise<void>}
 */
emailService.sendEmail = async (templateName, templateData, mailOptions) => {
  try {
    const originalTo = mailOptions.to;

    // DEV MODE (no VPN): Just console log the email
    if (devMode && !isVpnMode()) {
      console.log("\n" + "=".repeat(60));
      console.log("📧 DEV MODE: Email would be sent");
      console.log("=".repeat(60));
      console.log(`Template: ${templateName}`);
      console.log(`To: ${originalTo}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Data: ${JSON.stringify(templateData, null, 2)}`);
      console.log("=".repeat(60) + "\n");
      return Promise.resolve();
    }

    // VPN MODE: Redirect to admins but include original recipient info
    if (isVpnMode()) {
      const adminAddresses = getAdminAddresses();
      mailOptions.to = adminAddresses.join(", ");

      // Add header to template data showing who would have received this email
      templateData.vpnModeHeader = `[VPN MODE] This email would have been sent to: ${formatOriginalRecipients(originalTo)}`;

      console.log(
        `📧 VPN MODE: Redirecting email to admins (original: ${originalTo})`
      );
    }

    // PRODUCTION or VPN MODE: Actually send the email
    const email = new Email({
      message: {
        from: emailConfig.from,
      },
      transport: transporter,
      views: {
        root: templatesDir,
      },
      juice: true,
      juiceResources: {
        preserveImportant: true,
        webResources: {
          relativeTo: templatesDir,
        },
      },
    });

    await email.send({
      template: templateName,
      message: {
        to: mailOptions.to,
        subject: mailOptions.subject,
        priority: mailOptions.priority,
      },
      locals: templateData,
    });

    console.log(
      `Email sent successfully to: ${mailOptions.to} with subject: "${mailOptions.subject}"`
    );
    return Promise.resolve();
  } catch (err) {
    console.error(
      `Error sending email to ${mailOptions.to} with subject "${mailOptions.subject}":`,
      err
    );
    return Promise.reject(err);
  }
};

/**
 * Send email about new request to admins
 * @param {object} request - The request object
 */
emailService.newRequest = async (request) => {
  const adminAddresses = getAdminAddresses();

  const mailOptions = {
    to: adminAddresses.join(", "),
    subject: "TSL Proteomics - New Order",
    priority: "high",
  };

  const templateData = {
    request,
    baseURL: config.baseURL,
  };

  try {
    if (devMode) {
      console.log(
        `📧 New request email - JanCode: ${request.janCode || "N/A"} | Creator: ${request.createdBy}`
      );
    }
    await emailService.sendEmail("new-request", templateData, mailOptions);
  } catch (err) {
    console.error("Failed to send new request email:", err);
  }
};

/**
 * Send email about updated request to admins and creator
 * @param {object} request - The request object
 */
emailService.updatedRequest = async (request) => {
  const addresses = [...getAdminAddresses()];

  // Add request creator if they have an email
  if (request.createdBy && emailConfig.emailDomain) {
    const creatorEmail = request.createdBy + emailConfig.emailDomain;
    if (!addresses.includes(creatorEmail)) {
      addresses.push(creatorEmail);
    }
  }

  const mailOptions = {
    to: addresses.join(", "),
    subject: "TSL Proteomics - Updated Order",
    priority: "high",
  };

  const templateData = {
    request,
    baseURL: config.baseURL,
  };

  try {
    if (devMode) {
      console.log(
        `📧 Updated request email - JanCode: ${request.janCode || "N/A"} | Creator: ${request.createdBy}`
      );
    }
    await emailService.sendEmail("updated-request", templateData, mailOptions);
  } catch (err) {
    console.error("Failed to send updated request email:", err);
  }
};

/**
 * Send email about completed request to creator
 * @param {object} request - The request object
 */
emailService.requestComplete = async (request) => {
  if (!request.createdBy || !emailConfig.emailDomain) {
    console.error("Cannot send completion email: missing creator or domain");
    return;
  }

  const recipientEmail = request.createdBy + emailConfig.emailDomain;

  const mailOptions = {
    to: recipientEmail,
    subject: "TSL Proteomics - Request Complete",
    priority: "high",
  };

  const templateData = {
    request,
    baseURL: config.baseURL,
  };

  try {
    if (devMode) {
      console.log(
        `📧 Request complete email - JanCode: ${request.janCode || "N/A"} | Recipient: ${recipientEmail}`
      );
    }
    await emailService.sendEmail("request-complete", templateData, mailOptions);
  } catch (err) {
    console.error("Failed to send request complete email:", err);
  }
};

module.exports = emailService;
