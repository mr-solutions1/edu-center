import mongoose from 'mongoose';
import readline from 'readline';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load env vars
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdmin() {
  console.log('\n🚀 سكربت إنشاء مستخدم Admin لأكاديمية ركان\n');

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ خطأ: MONGO_URI غير موجود في ملف .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح.');

    const email = await question('📧 البريد الإلكتروني للـ Admin: ');
    const password = await question('🔑 كلمة المرور: ');
    const firstName = await question('👤 الاسم الأول: ');
    const lastName = await question('👤 الاسم الأخير: ');
    const phone = await question('📱 رقم الهاتف: ');

    const UserRole = {
      ADMIN: 'ADMIN',
      RECEPTIONIST: 'RECEPTIONIST',
      TEACHER: 'TEACHER',
      ACCOUNTANT: 'ACCOUNTANT',
    };

    // Define User Model Inline to avoid dependency issues during script run
    const userSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: { type: String, required: true, unique: true },
      role: { type: String, enum: Object.values(UserRole), default: UserRole.ADMIN },
      isActive: { type: Boolean, default: true },
      deletedAt: { type: Date, default: null },
    }, { timestamps: true });

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error('❌ خطأ: هذا البريد الإلكتروني مسجل مسبقاً.');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = new User({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      role: UserRole.ADMIN,
      isActive: true
    });

    await admin.save();

    console.log('\n✨ تم إنشاء مستخدم Admin بنجاح! ✨');
    console.log(`📧 البريد الإلكتروني: ${email}`);
    console.log('----------------------------------\n');

  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
  } finally {
    await mongoose.disconnect();
    rl.close();
  }
}

createAdmin();
