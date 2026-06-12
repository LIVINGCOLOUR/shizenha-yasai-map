// 収穫記録の削除（公開取り消し）エンドポイント。
// harvest-admin.html から farmerId と date を受け取り、その投稿日の
// 記録（動画・写真・ポスター）をR2から削除し、records.json から取り除く。
// 必要なバインディング: R2バケット HARVEST_BUCKET

const RECORDS_KEY = "harvest/records.json";
const MEDIA_PREFIX = "/api/harvest-media/";

export async function onRequestPost(context) {
  const { env, request } = context;
  const bucket = env.HARVEST_BUCKET;
  if (!bucket) {
    return json({ ok: false, error: "ストレージが未設定です（R2バインディング HARVEST_BUCKET を設定してください）。" }, 500);
  }

  let farmerId = "";
  let date = "";
  try {
    const form = await request.formData();
    farmerId = String(form.get("farmerId") || "").trim();
    date = String(form.get("date") || "").trim();
  } catch (error) {
    return json({ ok: false, error: "リクエストを読み取れませんでした。" }, 400);
  }

  if (!farmerId) {
    return json({ ok: false, error: "farmerId は必須です。" }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ ok: false, error: "date は YYYY-MM-DD 形式で指定してください。" }, 400);
  }

  let records = [];
  try {
    const existing = await bucket.get(RECORDS_KEY);
    if (existing) {
      const data = await existing.json();
      if (Array.isArray(data?.records)) records = data.records;
    }
  } catch (error) {
    records = [];
  }

  const targets = records.filter((item) => item.farmerId === farmerId && item.date === date);
  if (!targets.length) {
    return json({ ok: true, removed: false, message: "対象の投稿は見つかりませんでした。" });
  }

  // 記録が参照しているR2オブジェクトのキーを集める。
  const keys = new Set();
  for (const record of targets) {
    [record.videoUrl, record.poster, record.videoThumbnailUrl]
      .concat(Array.isArray(record.photoUrls) ? record.photoUrls : [])
      .forEach((url) => {
        const key = toMediaKey(url);
        if (key) keys.add(key);
      });
  }

  if (keys.size) {
    try {
      await bucket.delete(Array.from(keys));
    } catch (error) {
      // オブジェクト削除に失敗しても記録の除去は続行する。
    }
  }

  const remaining = records.filter((item) => !(item.farmerId === farmerId && item.date === date));
  try {
    await bucket.put(RECORDS_KEY, JSON.stringify({ records: remaining }, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
  } catch (error) {
    return json({ ok: false, error: "記録の更新に失敗しました。" }, 500);
  }

  return json({ ok: true, removed: true, deletedObjects: keys.size });
}

// "/api/harvest-media/harvest/..." 形式のURLからR2キーを取り出す。それ以外はnull。
function toMediaKey(url) {
  if (typeof url !== "string" || !url.startsWith(MEDIA_PREFIX)) return null;
  return url.slice(MEDIA_PREFIX.length).split("?")[0];
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
