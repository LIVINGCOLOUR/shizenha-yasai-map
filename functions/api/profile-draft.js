const CHECKLIST = [
  "農家さん本人が内容を確認する",
  "栽培方法の表現を確認する",
  "販売方法・連絡方法を確認する",
  "訪問・体験の可否を確認する",
  "公開してよい写真やURLを確認する",
  "本人確認後に掲載する",
];

const RESPONSE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const DEFAULT_MODEL = "gpt-4o-mini";

export async function onRequest(context) {
  const request = context.request;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: RESPONSE_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        error: "POST /api/profile-draft のみ対応しています。",
      },
      405
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "JSONの読み込みに失敗しました。",
      },
      400
    );
  }

  const answers = normalizeAnswers(payload && payload.answers);
  const apiKey = context.env && context.env.OPENAI_API_KEY;
  const model = (context.env && context.env.OPENAI_MODEL) || DEFAULT_MODEL;
  if (!apiKey) {
    return jsonResponse(createMockResponse(
      answers,
      "mock",
      "OPENAI_API_KEY が未設定のため、デモ生成で表示しています。",
      createDiagnostics({
        hasApiKey: false,
        model,
        errorStatus: null,
        errorType: "missing_api_key",
        errorMessage: "OPENAI_API_KEY is not configured.",
      })
    ));
  }

  try {
    const draft = await createDraftWithOpenAI(answers, apiKey, model);
    return jsonResponse({
      ok: true,
      mode: "openai",
      note: "OpenAI APIでプロフィール下書きを生成しました。実際の掲載前には農家さん本人の確認が必要です。",
      draft,
    });
  } catch (error) {
    return jsonResponse(createMockResponse(
      answers,
      "mock-fallback",
      "OpenAI API接続に失敗したため、デモ生成で表示しています。",
      createDiagnosticsFromError(error, { model, apiKey })
    ));
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function normalizeAnswers(rawAnswers) {
  const answers = rawAnswers && typeof rawAnswers === "object" ? rawAnswers : {};
  return {
    farmName: cleanText(answers.farmName),
    area: cleanText(answers.area),
    crops: cleanText(answers.crops),
    values: cleanText(answers.values),
    cultivation: cleanText(answers.cultivation),
    localConnection: cleanText(answers.localConnection),
    future: cleanText(answers.future),
    message: cleanText(answers.message),
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function createMockResponse(answers, mode, note, diagnostics) {
  const response = {
    ok: true,
    mode,
    note,
    draft: buildMockDraft(answers),
  };
  if (diagnostics) {
    response.diagnostics = diagnostics;
  }
  return response;
}

async function createDraftWithOpenAI(answers, apiKey, model) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: JSON.stringify({ answers }, null, 2),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw await createOpenAIHttpError(response, apiKey);
  }

  try {
    const data = await response.json();
    const text = extractResponseText(data);
    const draft = parseDraftJson(text);
    return validateDraft(draft, answers);
  } catch (error) {
    throw createOpenAIError("invalid_openai_response", "OpenAI response could not be parsed as the expected draft JSON.");
  }
}

async function createOpenAIHttpError(response, apiKey) {
  const status = response.status || null;
  let errorType = "openai_http_error";
  let errorMessage = `OpenAI API returned HTTP ${status || "unknown"}.`;

  try {
    const bodyText = await response.text();
    if (bodyText) {
      try {
        const body = JSON.parse(bodyText);
        if (body && body.error && typeof body.error === "object") {
          errorType = cleanDiagnosticType(body.error.type || errorType);
          errorMessage = cleanText(body.error.message) || errorMessage;
        } else {
          errorMessage = bodyText.slice(0, 240);
        }
      } catch (parseError) {
        errorMessage = bodyText.slice(0, 240);
      }
    }
  } catch (readError) {
    errorMessage = "OpenAI API returned an error response, but the error body could not be read.";
  }

  return createOpenAIError(errorType, errorMessage, status, apiKey);
}

function createOpenAIError(errorType, message, status = null, apiKey = "") {
  const error = new Error(sanitizeDiagnosticMessage(message, apiKey));
  error.safeType = cleanDiagnosticType(errorType);
  error.safeStatus = Number.isInteger(status) ? status : null;
  error.safeMessage = sanitizeDiagnosticMessage(message, apiKey);
  return error;
}

function createDiagnosticsFromError(error, context) {
  return createDiagnostics({
    hasApiKey: true,
    model: context.model,
    errorStatus: Number.isInteger(error && error.safeStatus) ? error.safeStatus : null,
    errorType: cleanDiagnosticType((error && error.safeType) || (error && error.name) || "openai_error"),
    errorMessage: sanitizeDiagnosticMessage(
      (error && (error.safeMessage || error.message)) || "OpenAI API request failed.",
      context.apiKey
    ),
  });
}

function createDiagnostics(values) {
  return {
    hasApiKey: Boolean(values.hasApiKey),
    model: cleanText(values.model) || DEFAULT_MODEL,
    errorStatus: Number.isInteger(values.errorStatus) ? values.errorStatus : null,
    errorType: cleanDiagnosticType(values.errorType || "unknown_error"),
    errorMessage: sanitizeDiagnosticMessage(values.errorMessage || "OpenAI API request failed."),
  };
}

function cleanDiagnosticType(value) {
  return cleanText(value).replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80) || "unknown_error";
}

function sanitizeDiagnosticMessage(value, apiKey = "") {
  let message = cleanText(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]");
  if (apiKey) {
    message = message.split(apiKey).join("[redacted]");
  }
  return message.slice(0, 240) || "OpenAI API request failed.";
}

function buildSystemPrompt() {
  return [
    "あなたは、自然派やさいマップの農家プロフィール下書きを手伝う編集者です。",
    "農家さんの回答をもとに、必ずJSONだけを返してください。JSON以外の説明文、Markdown、コードブロックは返さないでください。",
    "返すJSON形式は次のキーだけです。",
    '{"status":"下書き・本人確認前","farmName":"","area":"","crops":"","importantThings":"","cultivation":"","localConnection":"","future":"","message":"","restaurantMaterial":"","tagCandidates":[],"expressionMemo":[],"checklist":[]}',
    "ルール:",
    "- 日本語で出力する",
    "- 農家さんの言葉を尊重する",
    "- 誇張しすぎない",
    "- 断定しすぎない",
    "- 「無農薬」「安心安全」「有機」「オーガニック」などは慎重に扱う",
    "- 有機JAS認証が確認できない場合、「有機農家です」と断定しない",
    "- 未入力項目がある場合は自然に省略する",
    "- 農家本人が確認・修正する前提の下書きにする",
    "- tagCandidates は候補であり、断定しない",
    "- expressionMemo には注意が必要な表現があれば入れる",
    "- checklist には掲載前確認事項を入れる",
    "checklist には最低限、次の6項目を含めてください。",
    CHECKLIST.map((item) => `- ${item}`).join("\n"),
  ].join("\n");
}

function extractResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const parts = [];
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const contentItem of content) {
      if (typeof contentItem.text === "string") {
        parts.push(contentItem.text);
      }
    }
  }

  const text = parts.join("\n").trim();
  if (!text) {
    throw new Error("OpenAI response text missing");
  }
  return text;
}

function parseDraftJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw error;
    }
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
}

function validateDraft(draft, answers) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    throw new Error("Invalid draft shape");
  }

  const fallback = buildMockDraft(answers);
  const normalized = {
    status: cleanText(draft.status) || "下書き・本人確認前",
    farmName: cleanText(draft.farmName) || fallback.farmName,
    area: cleanText(draft.area) || fallback.area,
    crops: cleanText(draft.crops) || fallback.crops,
    importantThings: cleanText(draft.importantThings) || fallback.importantThings,
    cultivation: cleanText(draft.cultivation) || fallback.cultivation,
    localConnection: cleanText(draft.localConnection) || fallback.localConnection,
    future: cleanText(draft.future) || fallback.future,
    message: cleanText(draft.message) || fallback.message,
    restaurantMaterial: cleanText(draft.restaurantMaterial) || fallback.restaurantMaterial,
    tagCandidates: normalizeStringArray(draft.tagCandidates),
    expressionMemo: normalizeStringArray(draft.expressionMemo),
    checklist: mergeChecklist(normalizeStringArray(draft.checklist)),
  };

  if (!normalized.tagCandidates.length) {
    normalized.tagCandidates = fallback.tagCandidates;
  }
  if (!normalized.expressionMemo.length) {
    normalized.expressionMemo = fallback.expressionMemo;
  }

  return normalized;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item)).filter(Boolean);
}

function mergeChecklist(items) {
  const merged = [...items];
  for (const item of CHECKLIST) {
    if (!merged.includes(item)) merged.push(item);
  }
  return merged;
}

function buildMockDraft(answers) {
  const farmName = answers.farmName || "〇〇農園";
  const area = answers.area || "地域未入力";
  const crops = answers.crops || "育てているものは未入力です。";
  const importantThings = answers.values || "作物を育てるうえで大切にしていることは、本人確認時に追記します。";
  const cultivation = answers.cultivation || "栽培方法については、農家さん本人の確認後に掲載します。";
  const localConnection = answers.localConnection || "地域との関わりについては、本人確認時に整理します。";
  const future = answers.future || "これから目指したいことは、本人確認時に整理します。";
  const message = answers.message || "農家さんの想いは、本人確認時に追記します。";
  const profileText = [importantThings, message].filter(Boolean).join(" ");

  return {
    status: "下書き・本人確認前",
    farmName,
    area,
    crops,
    importantThings,
    cultivation,
    localConnection,
    future,
    message,
    restaurantMaterial: `${farmName}は、${area}で${crops}を育てています。農家さんのこだわりや地域との関わりを、売場POPやメニュー説明の素材として活用できます。`,
    tagCandidates: createTagCandidates(answers),
    expressionMemo: createExpressionMemo(Object.values(answers).join("\n")),
    checklist: CHECKLIST,
    profileText,
  };
}

function createTagCandidates(answers) {
  const text = Object.values(answers).join(" ");
  const products = answers.crops || "";
  const tags = [];
  const add = (condition, label) => {
    if (condition && !tags.includes(label)) tags.push(label);
  };

  add(/土|堆肥|微生物/.test(text), "土づくりを大切にする");
  add(/農薬を使わない|使っていない|不使用/.test(text), "栽培期間中、農薬を使わない");
  add(/減農薬|少なく|最低限/.test(text), "農薬や化学肥料に頼りすぎない");
  add(/地域|地元|学校|子ども|マルシェ/.test(text), "地域とのつながりを大切にする");
  add(/直売|定期便|販売店/.test(text), "直売・定期便で買える");
  add(/飲食店|レストラン|カフェ|仕入れ/.test(text), "飲食店・販売店が相談しやすい");
  add(/在来|固定種|自家採種|たね/.test(text), "在来種・固定種に関心がある");
  add(/見学|体験|収穫/.test(text), "体験・見学につながる");
  add(/米/.test(products), "米づくり");
  add(isMultipleVegetableAnswer(products), "多品目野菜");

  return tags;
}

function isMultipleVegetableAnswer(products) {
  const separators = (products.match(/[、,／/・]/g) || []).length;
  return /野菜|葉物|根菜|豆|なす|トマト|きゅうり|大根|かぼちゃ|米/.test(products) && separators >= 1;
}

function createExpressionMemo(text) {
  const memos = [];
  if (text.includes("無農薬")) {
    memos.push("「無農薬」という表現は、掲載時には慎重に扱う必要があります。必要に応じて「栽培期間中、農薬を使わない栽培に取り組んでいます」のような表現に整えます。");
  }
  if (text.includes("安心安全")) {
    memos.push("「安心安全」は受け取り方に個人差があるため、掲載時には断定を避け、育て方や確認情報を具体的に伝える表現に整えます。");
  }
  if (/有機|オーガニック/.test(text)) {
    memos.push("有機JAS認証の有無を確認したうえで、表現を調整します。");
  }
  if (!memos.length) {
    memos.push("現時点で大きな注意表現は見つかっていません。ただし、掲載前には農家さん本人と運営側で最終確認します。");
  }
  return memos;
}
