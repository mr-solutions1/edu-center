import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'مفتاح الصلاحية مطلوب'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'اسم الصلاحية مطلوب'],
      trim: true,
    },
    group: {
      type: String,
      required: [true, 'مجموعة الصلاحيات مطلوبة'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Permission = mongoose.model('Permission', permissionSchema);

export default Permission;
