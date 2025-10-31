import * as dotenv from 'dotenv';
dotenv.config();

 export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};