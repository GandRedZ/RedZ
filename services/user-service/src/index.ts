import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config";
import { setupDatabase } from "./database";

const errorHandler = async (
  error: any,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Log the error using Fastify's logger
  request.log.error(error);

  // Derive status code and message
  const statusCode = error?.statusCode ?? 500;
  const message =
    config.nodeEnv === "production"
      ? "Internal server error"
      : error?.message ?? "Unknown error";

  // Send structured error response
  reply.status(statusCode).send({
    statusCode,
    error: error?.name ?? "Error",
    message,
  });
};

const server = Fastify({
  logger: {
    level: config.nodeEnv === "production" ? "info" : "debug",
    transport:
      config.nodeEnv === "production"
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
  },
  ajv: {
    customOptions: {
      removeAdditional: "all",
      coerceTypes: true,
      useDefaults: true,
    },
  },
});

async function start() {
  try {
    // Setup database
    await setupDatabase();

    // Register plugins
    await server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    });

    await server.register(cors, {
      origin: config.corsOrigin.split(","),
      credentials: true,
    });

    await server.register(jwt, {
      secret: config.jwtSecret,
      sign: {
        expiresIn: config.jwtExpiresIn,
      },
    });

    // Swagger documentation
    await server.register(swagger, {
      openapi: {
        info: {
          title: "User Service API",
          description: "Authentication and user management service",
          version: "1.0.0",
        },
        servers: [
          {
            url: `http://localhost:${config.port}`,
            description: "Development server",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    });

    await server.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: false,
      },
    });

    // Register routes (TODO: add when created)
    // await server.register(authRoutes, { prefix: '/api/auth' });
    // await server.register(userRoutes, { prefix: '/api/users' });

    // Health check
    server.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    // Error handler
    server.setErrorHandler(errorHandler);

    // Start server
    await server.listen({
      port: config.port,
      host: config.host,
    });

    console.log(
      `🚀 User Service running on http://${config.host}:${config.port}`
    );
    console.log(
      `📚 API Documentation available at http://${config.host}:${config.port}/docs`
    );
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals = ["SIGINT", "SIGTERM"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} received, closing server...`);
    await server.close();
    process.exit(0);
  });
});

start();
