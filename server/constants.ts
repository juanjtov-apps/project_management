/**
 * Application constants and configuration.
 * Centralized location for default values and configuration.
 */

/**
 * Get list of root user emails from environment variable.
 * 
 * REQUIRED: ROOT_USER_EMAILS must be set for security.
 * Throws an error if not configured.
 */
export function getRootUserEmails(): string[] {
  const rootEmailsEnv = process.env.ROOT_USER_EMAILS;
  
  if (!rootEmailsEnv || rootEmailsEnv.trim() === "") {
    throw new Error(
      "ROOT_USER_EMAILS environment variable is required but not set. " +
      "Please set ROOT_USER_EMAILS to a comma-separated list of root user emails."
    );
  }
  
  const emails = rootEmailsEnv
    .split(",")
    .map(email => email.trim())
    .filter(email => email.length > 0);
  
  if (emails.length === 0) {
    throw new Error(
      "ROOT_USER_EMAILS environment variable is set but contains no valid emails. " +
      "Please provide at least one root user email."
    );
  }
  
  return emails;
}

/**
 * Check if a user is a root admin.
 * Checks in order: id === '0', then email in root user emails list.
 */
export function isRootAdmin(user: any): boolean {
  if (user.id === '0') {
    return true;
  }
  
  const rootEmails = getRootUserEmails();
  return rootEmails.includes(user.email);
}

