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
  return jsonResponse({
    ok: true,
    mode: "mock",
    note: "現在はデモ版です。OpenAI API連携はまだ行っていません。",
    draft: buildMockDraft(answers),
  });
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
