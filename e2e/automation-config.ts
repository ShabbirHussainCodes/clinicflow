/**
 * Values used ONLY by the end-to-end tests to exercise the automation dispatcher against a local
 * stand-in for n8n. They are throw-away test constants, not credentials for anything.
 */
export const AUTOMATION_E2E = {
  cronSecret: "e2e-cron-secret-0123456789abcdef",
  webhookSecret: "e2e-webhook-secret-0123456789abcdef",
  authToken: "e2e-webhook-token-0123456789abcdef",
  receiverPort: 5679,
  receiverPath: "/webhook/clinicflow",
};
