import fastify from 'fastify';

import fs from 'fs';
import handlebars from 'handlebars';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const server = fastify({ logger: true });

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
server.get('/templates/health-status', async (request, reply) => {
  return reply.code(200).send({ message: 'success' });
});

// eslint-disable-next-line require-await
server.get('/health-status', async (request, reply) => {
  return reply.code(200).send({ message: 'success' });
});

server.post('/templates', async (request, reply) => {
  const body = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    template: (request.body as any).template,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: (request.body as any).name,
  };
  try {
    await writeFile(`/data/templates/${body.name}`, Buffer.from(body.template), {
      encoding: 'utf8',
    });
    return reply.code(200).send({ message: 'success' });
  } catch (e) {
    return reply.code(500).send({ message: (e as Error).message, name: body.name });
  }
});

server.post('/templates/render', async (request, reply) => {
  const body = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variables: (request.body as any).variables,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: (request.body as any).name,
  };
  try {
    const data = await readFile(`/data/templates/${body.name}`, {
      encoding: 'utf8',
    });
    const html = handlebars.compile(data)(body.variables);
    return reply.code(200).send({ message: 'success', body: html });
  } catch (e) {
    return reply.code(500).send({ message: (e as Error).message });
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
