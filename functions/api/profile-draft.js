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
          content: buildUserPrompt(answers),
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
    "農家さんの短い回答、口語の回答、まだ整理されていない回答を、掲載前のプロフィール下書きとして自然な日本語に整えてください。",
    "農家さんの回答をもとに、必ずJSONだけを返してください。JSON以外の説明文、Markdown、コードブロックは返さないでください。",
    "返すJSON形式は次のキーだけです。",
    '{"status":"下書き・本人確認前","farmName":"","area":"","crops":"","importantThings":"","cultivation":"","localConnection":"","future":"","message":"","restaurantMaterial":"","tagCandidates":[],"expressionMemo":[],"checklist":[]}',
    "全体ルール:",
    "- 日本語で出力する",
    "- 農家さんの言葉を尊重する",
    "- 入力内容をそのままコピーしない",
    "- 話し言葉を、掲載前のプロフィール下書きとして自然な文章に整える",
    "- 短い回答や雑な回答でも、意味をくみ取って丁寧な表現にする",
    "- 乱暴な表現、くだけすぎた表現、意味が曖昧な表現は、穏やかで掲載可能な表現に直す",
    "- 「わからない」「つかわないじゃん」「いいこと」などの曖昧な回答は、断定せず、自然な表現に変換する",
    "- 入力が短すぎる場合でも空欄にせず、分かる範囲で控えめな文章にする",
    "- ただし、事実を勝手に増やしすぎない",
    "- 誇張しすぎない",
    "- 断定しすぎない",
    "- 不明なことは断定しない",
    "- 農家本人が確認・修正する前提の下書きにする",
    "- 「無農薬」「安心安全」「有機」「オーガニック」などは慎重に扱う",
    "- 農薬不使用、有機JAS、無農薬、安心安全などの表現は勝手に断定しない",
    "- 有機JAS認証が確認できない場合、「有機農家です」と断定しない",
    "- 未入力項目がある場合は自然に省略する",
    "- tagCandidates は候補であり、断定しない",
    "- expressionMemo には注意が必要な表現があれば入れる",
    "- checklist には掲載前確認事項を入れる",
    "",
    "各項目の生成ルール:",
    "- farmName: 農園名は原則として入力を尊重する。ただし不要な記号や明らかな誤字は軽く整える",
    "- area: 地域名は原則として入力を尊重する。勝手に市町村名を補完しすぎない",
    "- crops: 作物名は原則として入力を尊重する。複数ある場合は読みやすく整える",
    "- importantThings: 「大切にしていること」と「農家さんの想い」から、農家のこだわりが伝わる文章にする。入力をそのままコピーしない",
    "- cultivation: 農薬・化学肥料・有機・無農薬に関わる内容を慎重に表現する。「無農薬」と入力されても、すぐに断定せず、栽培期間中の農薬使用状況は本人確認が必要であることを補足する。有機JAS認証が不明な場合は「有機農家」と断定しない",
    "- localConnection: 地域イベント、販売店、学校、マルシェ、飲食店などの関わりを自然な文章にする。口語をそのまま出さない",
    "- future: 目指したいことが短い場合でも、前向きで控えめな文章に整える。勝手に大きなビジョンを作りすぎない",
    "- message: 農家紹介の短い本文として使える文章にする。農家詳細ページに載っても違和感がない表現にする",
    "- restaurantMaterial: 販売店POP、メニュー説明、Instagram投稿の素材に使いやすい文章にする。消費者向けに分かりやすくし、誇張しすぎない",
    "- tagCandidates: 入力内容から候補タグを出す。必ず候補として扱い、断定しない",
    "- expressionMemo: 「無農薬」「安心安全」「有機」「オーガニック」など、注意が必要な表現があればメモを出す。問題がなければ、掲載前に本人確認が必要である旨を書く",
    "",
    "変換例:",
    "入力例:",
    "農園名: やまだ",
    "地域: 八郷",
    "育てているもの: だいこん",
    "大切にしていること: やば無農薬",
    "栽培方法について: つかわないじゃん",
    "地域との関わり: 田植えイベントとかいろいろやってるよーん",
    "これから目指したいこと: いいこと",
    "望ましい出力例:",
    "farmName: やまだ",
    "area: 八郷",
    "crops: だいこん",
    "importantThings: 農薬に頼りすぎず、作物本来の育ち方を大切にしながら、だいこんを育てている農園です。",
    "cultivation: 栽培方法については、農薬をできるだけ使わない方針で取り組んでいる可能性があります。掲載前には、具体的な使用状況を農家さん本人に確認する必要があります。",
    "localConnection: 地域では、田植えイベントなどを通じて、農業に触れる機会づくりにも関わっています。",
    "future: これからも地域に根ざし、食べる人や地域とのつながりを大切にする農業を続けていきたいという想いがうかがえます。",
    "message: 八郷の地域で、だいこんづくりを通じて、自然や地域とのつながりを大切にしている農家です。",
    "restaurantMaterial: 八郷で育てられただいこんです。農薬に頼りすぎない栽培への関心や、地域イベントへの関わりなど、作り手の背景を伝えやすい食材です。店頭POPやメニュー説明では、地域とのつながりを感じられる野菜として紹介できます。",
    "上記は例です。実際の出力では、入力内容に応じて自然に生成してください。",
    "",
    "checklist には最低限、次の6項目を含めてください。",
    CHECKLIST.map((item) => `- ${item}`).join("\n"),
  ].join("\n");
}

function buildUserPrompt(answers) {
  return [
    "次の回答をもとに、農家プロフィールの掲載前下書きJSONを作成してください。",
    "回答が短い場合や口語の場合も、そのままコピーせず、意味をくみ取って自然な日本語に整えてください。",
    "",
    `農園名:\n${answers.farmName || "未入力"}`,
    "",
    `地域:\n${answers.area || "未入力"}`,
    "",
    `育てているもの:\n${answers.crops || "未入力"}`,
    "",
    `大切にしていること:\n${answers.values || "未入力"}`,
    "",
    `栽培方法について:\n${answers.cultivation || "未入力"}`,
    "",
    `地域との関わり:\n${answers.localConnection || "未入力"}`,
    "",
    `これから目指したいこと:\n${answers.future || "未入力"}`,
    "",
    `農家さんの想い:\n${answers.message || "未入力"}`,
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

  return polishCopiedFields(normalized, answers);
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

function polishCopiedFields(draft, answers) {
  const polished = { ...draft };
  const farmName = polished.farmName || answers.farmName || "この農園";
  const area = polished.area || answers.area || "地域";
  const crops = polished.crops || answers.crops || "作物";

  if (isExactCopy(polished.importantThings, answers.values)) {
    polished.importantThings = `${answers.values}という想いを大切にしながら、${area}で${crops}づくりに取り組んでいます。掲載前には、具体的な内容を農家さん本人と確認します。`;
  }
  if (isExactCopy(polished.cultivation, answers.cultivation)) {
    polished.cultivation = createCultivationSentence(answers.cultivation);
  }
  if (isExactCopy(polished.localConnection, answers.localConnection)) {
    polished.localConnection = `${answers.localConnection}といった地域との関わりがあります。掲載前には、現在の取り組み内容を農家さん本人に確認します。`;
  }
  if (isExactCopy(polished.future, answers.future)) {
    polished.future = `${answers.future}という想いをもとに、無理なく続けられる農業と地域とのつながりを大切にしていく意向がうかがえます。`;
  }
  if (isExactCopy(polished.message, answers.message)) {
    polished.message = `${farmName}は、${area}で${crops}を育てる農園です。農家さんの想いや詳しい取り組みは、本人確認後に掲載します。`;
  }
  if (isExactCopyOfAnyInput(polished.restaurantMaterial, answers)) {
    polished.restaurantMaterial = `${area}で育てられた${crops}です。作り手の想いや地域との関わりを伝えるための、売場POPやメニュー説明の素材として活用できます。掲載前には、栽培方法や販売方法を農家さん本人に確認します。`;
  }

  return polished;
}

function isExactCopy(value, source) {
  return Boolean(cleanText(value) && cleanText(value) === cleanText(source));
}

function isExactCopyOfAnyInput(value, answers) {
  const text = cleanText(value);
  if (!text) return false;
  return Object.values(answers).some((answer) => text === cleanText(answer));
}

function createCultivationSentence(cultivation) {
  const text = cleanText(cultivation);
  if (!text) {
    return "栽培方法については、農家さん本人の確認後に掲載します。";
  }
  if (/無農薬|農薬を使わない|使っていない|不使用/.test(text)) {
    return "農薬に頼りすぎない栽培に取り組んでいる可能性があります。掲載前には、栽培期間中の農薬使用状況や具体的な栽培方法を農家さん本人に確認する必要があります。";
  }
  if (/有機|オーガニック/.test(text)) {
    return "有機やオーガニックに関わる表現は、認証や具体的な取り組みの確認が必要です。掲載前には、農家さん本人と表現を確認します。";
  }
  return `${text}という栽培方針について、掲載前には具体的な内容を農家さん本人と確認します。`;
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
