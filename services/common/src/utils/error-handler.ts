import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  request.log.error(error);

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: "Validation Error",
      message: "Invalid request data",
      details: error.validation,
    });
  }

  // JWT errors
  if (error.message.includes("jwt") || error.message.includes("token")) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? "Internal Server Error" : error.message;

  reply.status(statusCode).send({
    error: error.name || "Error",
    message,
  });
}
