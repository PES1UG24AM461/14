import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { config } from '../config/env.js';
import User from '../models/User.js';

export function getSeedUserDefinitions(env = process.env) {
  const defaultPassword = env.SEED_PASSWORD || 'SeedPassword123!';
  const adminPassword = env.SEED_ADMIN_PASSWORD || defaultPassword;
  const facultyPassword = env.SEED_FACULTY_PASSWORD || defaultPassword;
  const studentPassword = env.SEED_STUDENT_PASSWORD || defaultPassword;

  return [
    // 1 Administrator
    {
      name: 'System Administrator',
      email: 'admin@example.com',
      role: 'administrator',
      password: adminPassword,
    },
    // 2 Faculty
    {
      name: 'Dr. Ramesh Kumar',
      email: 'faculty1@example.com',
      role: 'faculty',
      password: facultyPassword,
    },
    {
      name: 'Prof. Anita Sharma',
      email: 'faculty2@example.com',
      role: 'faculty',
      password: facultyPassword,
    },
    // 5 Students
    {
      name: 'Student One',
      email: 'student1@example.com',
      role: 'student',
      password: studentPassword,
    },
    {
      name: 'Student Two',
      email: 'student2@example.com',
      role: 'student',
      password: studentPassword,
    },
    {
      name: 'Student Three',
      email: 'student3@example.com',
      role: 'student',
      password: studentPassword,
    },
    {
      name: 'Student Four',
      email: 'student4@example.com',
      role: 'student',
      password: studentPassword,
    },
    {
      name: 'Student Five',
      email: 'student5@example.com',
      role: 'student',
      password: studentPassword,
    },
  ];
}

/**
 * Idempotently creates or updates seed users in the database.
 * Reuses the User model and bcrypt hash with salt rounds 12.
 */
export async function seedUsers(env = process.env) {
  const definitions = getSeedUserDefinitions(env);
  const results = [];

  for (const def of definitions) {
    const passwordHash = await bcrypt.hash(def.password, 12);
    const existing = await User.findOne({ email: def.email });

    if (existing) {
      existing.name = def.name;
      existing.role = def.role;
      existing.passwordHash = passwordHash;
      await existing.save();
      results.push({ id: existing._id.toString(), email: existing.email, role: existing.role });
    } else {
      const created = await User.create({
        name: def.name,
        email: def.email,
        passwordHash,
        role: def.role,
      });
      results.push({ id: created._id.toString(), email: created.email, role: created.role });
    }
  }

  return results;
}

export async function runSeed(uri = config.mongodbUri || process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is required to run the seed script.');
  }

  await connectDB(uri);
  try {
    const seeded = await seedUsers();
    console.log(`Successfully seeded ${seeded.length} users:`);
    for (const user of seeded) {
      console.log(`  - [${user.role}] ${user.email}`);
    }
    return seeded;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed script failed:', err.message);
      process.exit(1);
    });
}

