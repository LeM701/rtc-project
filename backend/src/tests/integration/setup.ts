import dotenv from 'dotenv';

dotenv.config({ quiet: true });

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rtc_test';
process.env.JWT_SECRET = 'integration-test-secret';
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000';
