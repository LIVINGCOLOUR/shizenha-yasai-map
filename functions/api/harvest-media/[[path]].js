// R2 に保存した収穫動画・ポスター画像を配信するエンドポイント。
// 動画シーク用に Range リクエストへ対応する。
// 必要なバインディング: R2バケット HARVEST_BUCKET

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const bucket = env.HARVEST_BUCKET;
  if (!bucket) {
    return new Response("storage not configured", { status: 500 });
  }

  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const key = segments.map((part) => decodeURIComponent(part)).join("/");
  if (!key) {
    return new Response("not found", { status: 404 });
  }

  const rangeHeader = request.headers.get("range");
  const range = rangeHeader ? parseRange(rangeHeader) : undefined;

  const obj = range ? await bucket.get(key, { range }) : await bucket.get(key);
  if (!obj) {
    return new Response("not found", { status: 404 });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=3600");

  if (range && obj.range) {
    const start = obj.range.offset || 0;
    const length = obj.range.length != null ? obj.range.length : obj.size - start;
    const end = start + length - 1;
    headers.set("content-range", `bytes ${start}-${end}/${obj.size}`);
    headers.set("content-length", String(length));
    return new Response(obj.body, { status: 206, headers });
  }

  headers.set("content-length", String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}

function parseRange(header) {
  const match = /bytes=(\d*)-(\d*)/.exec(header);
  if (!match) return undefined;
  const start = match[1] ? parseInt(match[1], 10) : undefined;
  const end = match[2] ? parseInt(match[2], 10) : undefined;
  if (start !== undefined && end !== undefined) return { offset: start, length: end - start + 1 };
  if (start !== undefined) return { offset: start };
  if (end !== undefined) return { suffix: end };
  return undefined;
}
