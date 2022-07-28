import fastify from 'fastify';
import cors from '@fastify/cors';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

const s3Client = new S3Client({ region: 'us-west-2' });

const server = fastify({ logger: false });

server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT'],
  credentials: false,
});

process.on('uncaughtException', () => {
  // eslint-disable-next-line no-console
  console.log('Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', async () => {
  // eslint-disable-next-line no-console
  console.log('Unhandled Rejection');
  await server.close();
  process.exit(1);
});

process.on('SIGINT', async () => {
  // eslint-disable-next-line no-console
  console.log('Container asked to stop');
  await server.close();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  // eslint-disable-next-line no-console
  console.log('Container asked to stop');
  await server.close();
  process.exit(0);
});

process.on('exit', () => {
  // eslint-disable-next-line no-console
  console.log('Exiting Process');
});

// eslint-disable-next-line require-await
server.get('/bff/health-status', async (request, reply) => {
  return reply.code(200).send({ message: 'success' });
});

// eslint-disable-next-line require-await
server.get('/health-status', async (request, reply) => {
  return reply.code(200).send({ message: 'success' });
});

// eslint-disable-next-line require-await
server.get('/', async (request, reply) => {
  return reply.code(200).send({ message: 'success' });
});

// eslint-disable-next-line require-await
server.get('/bff/upload-file', async (request, reply) => {
  try {
    // eslint-disable-next-line no-console
    console.log(process.env);
    const command = new PutObjectCommand({
      Bucket: `team-frontend-assets-${GLOBAL_VAR_NODE_ENV}`,
      Key: `recipients/${Date.now()}.csv`,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return reply.code(200).send({ message: 'okay', url });
  } catch (err) {
    return reply.code(500).send({ message: 'error', error: (err as Error).message });
  }
});

server.post('/bff/templates', async (request, reply) => {
  try {
    const url = `${process.env.TEMPLATE_MANAGER_SERVICE}/templates`;
    const response = await axios.post(url, request.body);
    return reply.code(200).send(response.data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    return reply.code(500).send({ message: 'Request failed' });
  }
});

server.post('/bff/templates/render', async (request, reply) => {
  try {
    // eslint-disable-next-line no-console
    console.log(process.env);
    // eslint-disable-next-line no-console
    console.log(process.env.TEMPLATE_MANAGER_SERVICE);
    const url = `${process.env.TEMPLATE_MANAGER_SERVICE}/templates`;
    // eslint-disable-next-line no-console
    console.log(url);
    const response = await axios.post(`${url}/render`, request.body);
    return reply.code(200).send(response.data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    return reply.code(500).send({ message: 'Request failed' });
  }
});

/**
 * Starts the server
 */
export async function startServer(): Promise<void> {
  try {
    await server.listen({
      port: 8080,
      host: '0.0.0.0',
    });
    // eslint-disable-next-line no-console
    console.log('Listening on port 8080');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to boot up', err as Error);
    throw err;
  }
}

// eslint-disable-next-line no-console
console.log(process.env.TEMPLATE_MANAGER_SERVICE);
