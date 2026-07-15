import mongoose from 'mongoose';

const tenantSettingsSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true,
    },
    instituteName: {
      type: String,
      required: true,
      default: 'Edu Center ERP',
    },
    logoUrl: {
      type: String,
      default: null,
    },
    faviconUrl: {
      type: String,
      default: null,
    },
    brandColors: {
      primary: { type: String, default: '#0F172A' }, // Deep slate/blue
      secondary: { type: String, default: '#D97706' }, // Gold/Amber
      accent: { type: String, default: '#3B82F6' }, // Blue
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
    },
    currency: {
      type: String,
      default: 'KWD',
    },
    timezone: {
      type: String,
      default: 'Asia/Kuwait',
    },
    locale: {
      type: String,
      default: 'ar',
    },
    workingDays: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 6], // Sunday to Thursday, and Saturday
    },
    attendanceRules: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        lateThresholdMinutes: 15,
        autoAbsentThresholdMinutes: 45,
      },
    },
    financialRules: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        taxPercentage: 0,
        lateFeeAmount: 5,
        discountLimitPercentage: 50,
      },
    },
    emailTemplates: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    notificationTemplates: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    aiSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        enabled: true,
      },
    },
    integrations: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        whatsappEnabled: false,
        smsEnabled: false,
      },
    },
    featureFlags: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        crmEnabled: true,
        examsEnabled: true,
        aiAssistantEnabled: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

const TenantSettings = mongoose.model('TenantSettings', tenantSettingsSchema);

export default TenantSettings;
