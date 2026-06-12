// 収穫動画の登録（公開）エンドポイント。
// harvest-admin.html からアップロードされた動画を R2 に保存し、
// 記録インデックス harvest/records.json を更新する。
// 必要なバインディング: R2バケット HARVEST_BUCKET

const RECORDS_KEY = "harvest/records.json";
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB
const MAX_POSTER_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15MB / 1枚
const MAX_PHOTOS = 12;

export async function onRequestPost(context) {
  const { env, request } = context;
  const bucket = env.HARVEST_BUCKET;
  if (!bucket) {
    return json(
      { ok: false, error: "ストレージが未設定です（R2バインディング HARVEST_BUCKET を設定してください）。" },
      500
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch (error) {
    return json({ ok: false, error: "フォームデータを読み取れませんでした。" }, 400);
  }

  const farmerId = String(form.get("farmerId") || "").trim();
  const date = String(form.get("date") || "").trim();
  const message = String(form.get("message") || "").trim();
  const dateLabel = String(form.get("dateLabel") || "").trim() || formatDateLabel(date);
  const profileUrl =
    String(form.get("profileUrl") || "").trim() || `farmer.html?id=${encodeURIComponent(farmerId)}`;
  const video = form.get("video");
  const poster = form.get("poster");
  const photoFiles = form.getAll("photo").filter(isUploadedFile);

  if (!farmerId) {
    return json({ ok: false, error: "farmerId は必須です。" }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ ok: false, error: "date は YYYY-MM-DD 形式で指定してください。" }, 400);
  }
  if (!isUploadedFile(video)) {
    return json({ ok: false, error: "動画ファイルが必要です。" }, 400);
  }
  if (video.size > MAX_VIDEO_BYTES) {
    return json({ ok: false, error: "動画ファイルが大きすぎます（最大200MB）。" }, 413);
  }

  const safeFarmer = sanitizeSegment(farmerId);
  const videoExt = pickExtension(video, "mp4");
  const videoKey = `harvest/${safeFarmer}/${date}.${videoExt}`;

  try {
    await bucket.put(videoKey, video.stream(), {
      httpMetadata: { contentType: video.type || "video/mp4" },
    });
  } catch (error) {
    return json({ ok: false, error: "動画の保存に失敗しました。" }, 500);
  }

  // 写真（複数可）を保存して photoUrls を作る。
  const photoUrls = [];
  for (let i = 0; i < photoFiles.length && photoUrls.length < MAX_PHOTOS; i += 1) {
    const photo = photoFiles[i];
    if (!photo.size || photo.size > MAX_PHOTO_BYTES) continue;
    const photoExt = pickExtension(photo, "jpg");
    const photoKey = `harvest/${safeFarmer}/${date}-photo-${i + 1}.${photoExt}`;
    try {
      await bucket.put(photoKey, photo.stream(), {
        httpMetadata: { contentType: photo.type || "image/jpeg" },
      });
      photoUrls.push(`/api/harvest-media/${photoKey}`);
    } catch (error) {
      // 1枚失敗しても他は続行。
    }
  }

  // ポスター（動画サムネイル）。明示指定があれば優先、無ければ1枚目の写真。
  let posterUrl = "";
  if (isUploadedFile(poster) && poster.size > 0 && poster.size <= MAX_POSTER_BYTES) {
    const posterExt = pickExtension(poster, "jpg");
    const posterKey = `harvest/${safeFarmer}/${date}-poster.${posterExt}`;
    try {
      await bucket.put(posterKey, poster.stream(), {
        httpMetadata: { contentType: poster.type || "image/jpeg" },
      });
      posterUrl = `/api/harvest-media/${posterKey}`;
    } catch (error) {
      posterUrl = "";
    }
  }
  if (!posterUrl && photoUrls.length) {
    posterUrl = photoUrls[0];
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

  const record = {
    farmerId,
    date,
    dateLabel,
    message,
    videoUrl: `/api/harvest-media/${videoKey}`,
    poster: posterUrl,
    videoThumbnailUrl: posterUrl,
    photoUrls,
    profileUrl,
    createdAt: dateLabel ? `${date}T00:00:00.000Z` : "",
  };
  // 同じ農家・同じ日付の記録は上書き。
  records = records.filter((item) => !(item.farmerId === farmerId && item.date === date));
  records.push(record);

  try {
    await bucket.put(RECORDS_KEY, JSON.stringify({ records }, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
  } catch (error) {
    return json({ ok: false, error: "記録の更新に失敗しました。" }, 500);
  }

  return json({ ok: true, record });
}

function isUploadedFile(value) {
  return value && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.stream === "function";
}

function sanitizeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "-");
}

function pickExtension(file, fallback) {
  const fromName = String(file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  if (fromName) return fromName[1];
  const fromType = String(file.type || "").toLowerCase().match(/\/([a-z0-9]+)$/);
  if (fromType) return fromType[1].replace("quicktime", "mov").replace("jpeg", "jpg");
  return fallback;
}

function formatDateLabel(date) {
  const parts = String(date).split("-");
  if (parts.length !== 3) return String(date);
  return `${Number(parts[0])}年${Number(parts[1])}月${Number(parts[2])}日`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
