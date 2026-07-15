import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم المؤسسة مطلوب'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'الرابط الفرعي (Slug) مطلوب'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;
