// 収穫記録の一覧を返すエンドポイント。
// R2 の harvest/records.json を読み、無ければ空配列を返す。
// フロント側は空/失敗時に静的 data/harvest-records.json へフォールバックする。
// 必要なバインディング: R2バケット HARVEST_BUCKET

const RECORDS_KEY = "harvest/records.json";

export async function onRequestGet(context) {
  const { env } = context;
  const bucket = env.HARVEST_BUCKET;
  let records = [];

  if (bucket) {
    try {
      const obj = await bucket.get(RECORDS_KEY);
      if (obj) {
        const data = await obj.json();
        if (Array.isArray(data?.records)) records = data.records;
      }
    } catch (error) {
      records = [];
    }
  }

  return new Response(JSON.stringify({ records }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
