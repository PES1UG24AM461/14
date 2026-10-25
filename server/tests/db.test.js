import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { clearTestDB, closeTestDB, connectTestDB } from './helpers/db.js';

describe('Test database helper (OQS-01)', () => {
  beforeAll(connectTestDB);
  afterEach(clearTestDB);
  afterAll(closeTestDB);

  it('connects to an in-memory MongoDB and can write and read documents', async () => {
    const Sample = mongoose.model('Sample', new mongoose.Schema({ name: String }));
    await Sample.create({ name: 'quiz' });
    expect(await Sample.countDocuments()).toBe(1);
  });
});
