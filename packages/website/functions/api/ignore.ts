/* eslint-disable unicorn/prefer-response-static-json */
import { configure, getUser } from 'osm-api';
import { z } from 'zod';
import type { IgnoreFile, IgnoreInfo } from '@lol-import/parser';
import type { Handler } from '../_helpers/types.def';

async function safely<T>(f: () => T | Promise<T>): Promise<T | undefined> {
  try {
    return await f();
  } catch {
    return undefined;
  }
}

const requestSchema = z.object({
  comment: z.string().max(1000),
  diffHash: z.string().length(6),
  ialaId: z.string().max(10),
});

export const onRequest: Handler = async (context) => {
  const DB = (await context.env.KV_STORE.get<IgnoreFile>(
    'lol_ignore',
    'json',
  )) || { ignored: {} };
  if (context.request.method === 'GET') {
    return new Response(JSON.stringify(DB));
  }

  // any other HTTP method is a write

  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'no auth header' }));
  }

  const payload = await safely(async () =>
    requestSchema.parse(await context.request.json()),
  );
  if (!payload) {
    return new Response(JSON.stringify({ error: 'invalid payload' }));
  }

  configure({ authHeader });
  const me = await safely(() => getUser('me'));
  if (!me) {
    return new Response(JSON.stringify({ error: 'unauthorised' }));
  }

  const record: IgnoreInfo = {
    username: me.display_name,
    comment: payload.comment,
    diffHash: payload.diffHash,
    date: new Date().toISOString(),
  };

  DB.ignored[payload.ialaId] = record;
  await context.env.KV_STORE.put('lol_ignore', JSON.stringify(DB));

  return new Response(JSON.stringify(DB));
};
