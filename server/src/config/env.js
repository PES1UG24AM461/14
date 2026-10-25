// Central place for configuration read from environment variables (SRS SEC-005: no secrets in code).
export const config = {
  port: Number(process.env.PORT) || 5050,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
