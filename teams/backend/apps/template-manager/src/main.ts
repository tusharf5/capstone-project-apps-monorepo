import fastify from "fastify";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: "us-west-2" });

const server = fastify({ logger: true });

process.on("uncaughtException", () => {
  // eslint-disable-next-line no-console
  console.log("Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", async () => {
  // eslint-disable-next-line no-console
  console.log("Unhandled Rejection");
  await server.close();
  process.exit(1);
});

process.on("SIGINT", async () => {
  // eslint-disable-next-line no-console
  console.log("Container asked to stop");
  await server.close();
  process.exit(0);
});

process.once("SIGTERM", async () => {
  // eslint-disable-next-line no-console
  console.log("Container asked to stop");
  await server.close();
  process.exit(0);
});

process.on("exit", () => {
  // eslint-disable-next-line no-console
  console.log("Exiting Process");
});

// eslint-disable-next-line require-await
server.get("/bff/health-status", async (request, reply) => {
  return reply.code(200).send({ message: "success" });
});

// eslint-disable-next-line require-await
server.get("/health-status", async (request, reply) => {
  return reply.code(200).send({ message: "success" });
});

// eslint-disable-next-line require-await
server.get("/test", async (request, reply) => {
  try {
    await s3Client.send(
      // TODO add env and region to this
      new PutObjectCommand({
        Bucket: "team-backend-assets-dev",
        Body: Buffer.from("{}"),
        Key: "file.json",
      })
    );
    return reply.code(200).send({ message: "okay" });
  } catch (err) {
    return reply
      .code(500)
      .send({ message: "error", error: (err as Error).message });
  }
});

/**
 * Starts the server
 */
export async function startServer(): Promise<void> {
  try {
    await server.listen({
      port: 8080,
      host: "0.0.0.0",
    });
    // eslint-disable-next-line no-console
    console.log("Listening on port 8080");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to boot up", err as Error);
    throw err;
  }
}
