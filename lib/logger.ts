export const log = {
  info: (step: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ℹ️  ${step}: ${message}`, data || "");
  },

  success: (step: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${step}: ${message}`, data || "");
  },

  error: (step: string, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${step}: ${message}`, error || "");
  },

  warning: (step: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ⚠️  ${step}: ${message}`, data || "");
  },
};
