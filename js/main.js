let currentDetailFarmer = null;
let lastDemoTrigger = null;
let lastAiDemoTrigger = null;
let lastConceptDemoTrigger = null;
let homepageFarmers = [];
const selectedInterestLabels = new Set();

const INTEREST_LABELS = [
  "在来種・固定種を育てる農家",
  "土づくりを大切にする農家",
  "直売・定期便で買える農家",
  "飲食店・販売店が相談しやすい農家",
  "見学・体験につながる農家",
  "里山の暮らしを大切にする農家",
];

const EAT_REGION_LABELS = [
  "石岡市",
  "笠間市",
  "水戸市",
  "つくば市",
  "土浦市",
  "小美玉市",
  "かすみがうら市",
  "桜川市",
  "茨城町",
  "城里町",
];

const EAT_SCENE_LABELS = [
  "カフェ",
  "ランチ",
  "ディナー",
  "子どもが入りやすい",
  "一人で入りやすい",
  "季節の野菜を楽しめる",
  "地域に根差した野菜を楽しめる",
  "農家の背景が見える",
  "予約して行きたい",
];

const EAT_FARMER_LABELS = ["やまだ農園", "〇〇自然農園"];

const EAT_DEMO_PLACES = [
  {
    id: "satoyama-gohan-tsuchinoko",
    name: "里山ごはん つちのこ",
    type: "飲食店・ランチ",
    region: "石岡市八郷周辺",
    municipalities: ["石岡市"],
    description: "地元農家の季節野菜を使った食事を楽しめるお店です。地域の農や野菜の背景に触れられる場所です。",
    usedItems: ["季節の野菜", "米", "だいこん"],
    connectedFarmers: [{ name: "やまだ農園", farmerId: "yamada-nouen" }],
    visibleBackground: "やまだ農園の季節野菜を使ったメニューを通じて、八郷周辺の農の営みを感じられます。",
    statusLabel: "デモ表示・店舗確認前",
    sceneTags: ["ランチ", "季節の野菜を楽しめる", "地域に根差した野菜を楽しめる", "農家の背景が見える", "予約して行きたい"],
    tags: ["地元野菜を使う店", "農家の背景が見える店", "ランチ", "季節の野菜を楽しめる"],
    checkMemo: "営業時間や提供内容は変わることがあります。訪問前に店舗の公式情報を確認してください。",
  },
  {
    id: "komorebi-cafe-sample",
    name: "カフェこもれび（サンプル）",
    type: "カフェ",
    region: "つくば市周辺",
    municipalities: ["つくば市", "土浦市"],
    description: "地域の野菜を使った軽食や季節のプレートをイメージしたサンプル店舗です。実在店舗を特定する情報ではありません。",
    usedItems: ["季節の野菜", "ハーブ", "焼き菓子"],
    connectedFarmers: [{ name: "〇〇自然農園", farmerId: "model-shizen-nouen" }],
    visibleBackground: "自然体験や土づくりに関心のある農家像とつながる、やわらかな食の入口として表示しています。",
    statusLabel: "デモ表示・店舗確認前",
    sceneTags: ["カフェ", "子どもが入りやすい", "一人で入りやすい", "季節の野菜を楽しめる", "農家の背景が見える"],
    tags: ["地元野菜を使う店", "カフェ", "一人で入りやすい", "農家の背景が見える店"],
    checkMemo: "メニューや営業日は未確認です。実運用時は店舗確認後に掲載します。",
  },
  {
    id: "machi-no-hatake-table",
    name: "まちの畑テーブル（サンプル）",
    type: "飲食店・ディナー",
    region: "水戸市周辺",
    municipalities: ["水戸市", "茨城町"],
    description: "地元野菜を使った食事を通じて、作り手の背景を少し知るためのサンプル店舗です。",
    usedItems: ["季節の野菜", "米", "根菜"],
    connectedFarmers: [{ name: "やまだ農園", farmerId: "yamada-nouen" }],
    visibleBackground: "季節の野菜や米を使った料理から、地域の農家が続けている日々の営みに目を向けられます。",
    statusLabel: "デモ表示・店舗確認前",
    sceneTags: ["ディナー", "予約して行きたい", "地域に根差した野菜を楽しめる", "農家の背景が見える"],
    tags: ["地元野菜を使う店", "ディナー", "予約して行きたい", "地域に根差した野菜を楽しめる"],
    checkMemo: "席数、予約、提供内容は店舗確認後に掲載する想定です。",
  },
];

const selectedEatRegions = new Set();
const selectedEatScenes = new Set();
const selectedEatFarmers = new Set();

function currentPageName() {
  const path = window.location.pathname.replace(/\/$/, "");
  const last = path.split("/").pop() || "index";
  return last.replace(/\.html$/, "") || "index";
}

function isPage(name) {
  return currentPageName() === name;
}

document.addEventListener("DOMContentLoaded", function () {
  setupDemoActionDialog();
  setupAiProfileDemoDialog();
  setupConceptDemoDialog();
  setupProfileInterviewDemo();
  setupDeferredHarvestVideos();

  if (isPage("farmers")) {
    loadFarmersList();
  }
  if (isPage("places")) {
    loadPlacesList();
  }
  if (isPage("eat")) {
    setupEatPage();
  }
  if (isPage("farmer")) {
    loadFarmerDetail();
  }
  if (isPage("index") || isPage("learn")) {
    setupInterestFilters();
    loadHomepageFarmers();
  }
  if (isPage("seeds")) {
    loadSeedsMap();
  }
  if (isPage("harvest-video")) {
    setupHarvestVideoPage();
  }
});

function loadHomepageFarmers() {
  fetch("data/farmers.json")
    .then((response) => response.json())
    .then((farmers) => {
      homepageFarmers = Array.isArray(farmers) ? farmers : [];
      setupInterestFilters();
      renderHomepageFarmers();
    })
    .catch(() => {
      const container = document.getElementById("homepageFarmers");
      if (container) {
        container.innerHTML = '<p class="loading-text">農家情報の読み込みに失敗しました。</p>';
      }
    });
}

function setupInterestFilters() {
  const container = document.getElementById("interestFilterOptions");
  if (!container) return;

  container.innerHTML = INTEREST_LABELS
    .map((label) => {
      const active = selectedInterestLabels.has(label);
      return `<button class="interest-filter-button${active ? " is-active" : ""}" type="button" data-interest-label="${escapeAttribute(label)}" aria-pressed="${active}"><span>${escapeHtml(label)}</span></button>`;
    })
    .join("");

  updateInterestStatus();

  if (container.dataset.ready === "true") return;
  container.dataset.ready = "true";
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-interest-label]");
    if (!button) return;
    const label = button.dataset.interestLabel;
    if (selectedInterestLabels.has(label)) {
      selectedInterestLabels.delete(label);
    } else {
      selectedInterestLabels.add(label);
    }
    setupInterestFilters();
    renderHomepageFarmers();
  });
}

function updateInterestStatus() {
  const status = document.getElementById("interestFilterStatus");
  const farmersLink = document.getElementById("interestFarmersLink");
  if (!status) return;
  if (!selectedInterestLabels.size) {
    status.innerHTML = '<span>気になる項目を選ぶと、近い農家が上に表示されます。</span>';
    if (farmersLink) farmersLink.hidden = true;
    return;
  }
  const selectedText = Array.from(selectedInterestLabels).map(escapeHtml).join("、");
  status.innerHTML = `
    <span>選択中：${selectedText}</span>
    <small>あなたの関心に近い農家を表示しています。</small>`;
  if (farmersLink) farmersLink.hidden = false;
}

function renderHomepageFarmers() {
  const container = document.getElementById("homepageFarmers");
  if (!container) return;

  if (!homepageFarmers.length) {
    container.innerHTML = '<p class="loading-text">農家情報が見つかりませんでした。</p>';
    return;
  }

  const sortedFarmers = homepageFarmers
    .map((farmer, index) => ({
      farmer,
      index,
      matchCount: getInterestMatchCount(farmer),
    }))
    .sort((a, b) => {
      if (!selectedInterestLabels.size) return a.index - b.index;
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.index - b.index;
    });

  container.innerHTML = sortedFarmers
    .slice(0, 4)
    .map(({ farmer, matchCount }) => createHomepageFarmerCard(farmer, matchCount))
    .join("");
}

function createHomepageFarmerCard(farmer, matchCount) {
  const imageSrc = getFarmerImageSrc(farmer);
  const statusText = getFarmerStatusText(farmer);
  const interestTags = createInterestTagsHtml(farmer, true);
  const matchText = createInterestMatchSummaryHtml(farmer, matchCount);

  return `
    <article class="farm-card">
      <div class="farm-card-image">
        <img src="${escapeAttribute(imageSrc)}" alt="${escapeAttribute(farmer.name)} の畑イメージ" />
        <span class="farm-card-region">${escapeHtml(farmer.regionLabel)}</span>
      </div>
      <div class="farm-card-body">
        <div class="farm-card-title-row">
          <h3>${escapeHtml(farmer.name)}</h3>
          <span class="farm-card-status">${escapeHtml(statusText)}</span>
        </div>
        <p class="farm-card-style">${escapeHtml(farmer.farmingStyle)}</p>
        <p class="farm-card-intro">${escapeHtml(farmer.shortDescription)}</p>
        <dl class="farm-card-facts">
          <div>
            <dt>育てているもの</dt>
            <dd>${escapeHtml(farmer.mainProducts)}</dd>
          </div>
          <div>
            <dt>場所の目安</dt>
            <dd>${escapeHtml(farmer.regionLabel)}</dd>
          </div>
        </dl>
        <div class="farm-card-interest-tags" aria-label="価値観タグ">
          ${interestTags}
        </div>
        ${matchText}
        <div class="farm-card-actions single-action">
          <a class="button farm-card-primary" href="farmer.html?id=${encodeURIComponent(farmer.id)}">詳しく見る</a>
        </div>
      </div>
    </article>`;
}

function setupEatPage() {
  const list = document.getElementById("eatPlaceList");
  if (!list) return;

  renderEatFilterButtons("eatRegionFilters", EAT_REGION_LABELS, selectedEatRegions, "eat-region", "eatRegion");
  renderEatFilterButtons("eatSceneFilters", EAT_SCENE_LABELS, selectedEatScenes, "eat-scene", "eatScene");
  renderEatFilterButtons("eatFarmerFilters", EAT_FARMER_LABELS, selectedEatFarmers, "eat-farmer", "eatFarmer");
  renderEatPlaces();
  setupEatLocationButton();
  setupEatPrefectureSelect();

  if (list.dataset.ready === "true") return;
  list.dataset.ready = "true";
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-eat-detail-id]");
    if (!button) return;
    const place = EAT_DEMO_PLACES.find((item) => item.id === button.dataset.eatDetailId);
    if (!place) return;
    renderEatDetail(place);
    const panel = document.getElementById("eatDetailPanel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupEatPrefectureSelect() {
  const select = document.getElementById("eatPrefectureSelect");
  const note = document.getElementById("eatPrefectureNote");
  if (!select || select.dataset.ready === "true") return;
  select.dataset.ready = "true";
  select.addEventListener("change", () => {
    if (note) {
      note.hidden = select.value === "茨城県";
    }
  });
}

function setupEatLocationButton() {
  const button = document.querySelector("[data-eat-location-button]");
  const status = document.getElementById("eatLocationStatus");
  if (!button || button.dataset.ready === "true") return;
  button.dataset.ready = "true";
  button.addEventListener("click", () => {
    if (!status) return;
    if (!navigator.geolocation) {
      status.textContent = "現在地を取得できませんでした。地域を選んで探してください。";
      return;
    }
    status.textContent = "現在地を確認しています。デモでは地域候補の表示にのみ使います。";
    navigator.geolocation.getCurrentPosition(
      () => {
        selectedEatRegions.add("石岡市");
        status.textContent = "現在地候補として茨城県内の地域を表示しました。デモでは石岡市周辺を選択しています。";
        renderEatFilterButtons("eatRegionFilters", EAT_REGION_LABELS, selectedEatRegions, "eat-region", "eatRegion");
        renderEatPlaces();
      },
      () => {
        status.textContent = "現在地を取得できませんでした。地域を選んで探してください。";
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
    );
  });
}

function renderEatFilterButtons(containerId, labels, selectedSet, dataAttr, datasetKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = labels
    .map((label) => {
      const active = selectedSet.has(label);
      return `<button class="eat-filter-button${active ? " is-active" : ""}" type="button" data-${dataAttr}="${escapeAttribute(label)}" aria-pressed="${active}">${escapeHtml(label)}</button>`;
    })
    .join("");

  if (container.dataset.ready === "true") return;
  container.dataset.ready = "true";
  container.addEventListener("click", (event) => {
    const button = event.target.closest(`[data-${dataAttr}]`);
    if (!button) return;
    const label = button.dataset[datasetKey];
    if (selectedSet.has(label)) {
      selectedSet.delete(label);
    } else {
      selectedSet.add(label);
    }
    renderEatFilterButtons(containerId, labels, selectedSet, dataAttr, datasetKey);
    renderEatPlaces();
  });
}

function renderEatPlaces() {
  const list = document.getElementById("eatPlaceList");
  const status = document.getElementById("eatResultStatus");
  if (!list) return;

  const selectedCount = selectedEatRegions.size + selectedEatScenes.size + selectedEatFarmers.size;
  const sortedPlaces = EAT_DEMO_PLACES
    .map((place, index) => ({
      place,
      index,
      matchCount: getEatMatchCount(place),
    }))
    .sort((a, b) => {
      if (!selectedCount) return a.index - b.index;
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.index - b.index;
    });

  list.innerHTML = sortedPlaces.map(({ place, matchCount }) => createEatPlaceCardHtml(place, matchCount)).join("");
  if (status) {
    status.textContent = selectedCount
      ? "選択した条件に近い飲食店カードを上に表示しています。"
      : "条件を選ぶと、近い飲食店カードが上に表示されます。";
  }
}

function getEatMatchCount(place) {
  const regionMatches = (place.municipalities || []).filter((label) => selectedEatRegions.has(label)).length;
  const sceneMatches = (place.sceneTags || []).filter((label) => selectedEatScenes.has(label)).length;
  const farmerMatches = (place.connectedFarmers || []).filter((farmer) => selectedEatFarmers.has(farmer.name)).length;
  return regionMatches + sceneMatches + farmerMatches;
}

function createEatPlaceCardHtml(place, matchCount) {
  const usedItems = Array.isArray(place.usedItems) ? place.usedItems : [];
  const connectedFarmers = Array.isArray(place.connectedFarmers) ? place.connectedFarmers : [];
  const tags = Array.isArray(place.tags) ? place.tags : [];
  const matchBadge = matchCount > 0
    ? `<span class="eat-match-badge">一致 ${matchCount}</span>`
    : "";

  return `
    <article class="eat-place-card">
      <div class="eat-place-head">
        <p class="place-kind">${escapeHtml(place.type)}</p>
        <span class="place-status">${escapeHtml(place.statusLabel)}</span>
      </div>
      <h3>${escapeHtml(place.name)}</h3>
      <p class="eat-place-region">${escapeHtml(place.region)} ${matchBadge}</p>
      <p>${escapeHtml(place.description)}</p>
      <dl class="eat-place-facts">
        <div>
          <dt>使っている野菜・食材</dt>
          <dd>${escapeHtml(usedItems.join(" / "))}</dd>
        </div>
        <div>
          <dt>つながりのある農家</dt>
          <dd>${escapeHtml(connectedFarmers.map((farmer) => farmer.name).join(" / "))}</dd>
        </div>
        <div>
          <dt>この店で見える背景</dt>
          <dd>${escapeHtml(place.visibleBackground)}</dd>
        </div>
      </dl>
      <div class="eat-card-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <button class="button primary eat-detail-button" type="button" data-eat-detail-id="${escapeAttribute(place.id)}">詳しく見る</button>
    </article>`;
}

function renderEatDetail(place) {
  const panel = document.getElementById("eatDetailPanel");
  if (!panel) return;
  const usedItems = Array.isArray(place.usedItems) ? place.usedItems : [];
  const connectedFarmers = Array.isArray(place.connectedFarmers) ? place.connectedFarmers : [];

  panel.innerHTML = `
    <article class="eat-detail-card">
      <div>
        <p class="section-eyebrow">${escapeHtml(place.statusLabel)}</p>
        <h3>${escapeHtml(place.name)}</h3>
        <p>${escapeHtml(place.description)}</p>
      </div>
      <dl class="eat-detail-list">
        <div>
          <dt>地域</dt>
          <dd>${escapeHtml(place.region)}</dd>
        </div>
        <div>
          <dt>種別</dt>
          <dd>${escapeHtml(place.type)}</dd>
        </div>
        <div>
          <dt>使っている野菜・食材</dt>
          <dd>${escapeHtml(usedItems.join(" / "))}</dd>
        </div>
        <div>
          <dt>つながりのある農家</dt>
          <dd>${escapeHtml(connectedFarmers.map((farmer) => farmer.name).join(" / "))}</dd>
        </div>
        <div>
          <dt>農家ページへのリンク</dt>
          <dd>${connectedFarmers.map(createEatFarmerLinkHtml).join(" / ")}</dd>
        </div>
        <div>
          <dt>この店で見える背景</dt>
          <dd>${escapeHtml(place.visibleBackground)}</dd>
        </div>
        <div>
          <dt>利用前の確認メモ</dt>
          <dd>${escapeHtml(place.checkMemo)}</dd>
        </div>
        <div>
          <dt>確認状態</dt>
          <dd>${escapeHtml(place.statusLabel)}</dd>
        </div>
      </dl>
    </article>`;
}

function createEatFarmerLinkHtml(farmer) {
  if (!farmer || !farmer.farmerId) return escapeHtml(farmer && farmer.name ? farmer.name : "本人確認後に掲載");
  return `<a href="farmer.html?id=${encodeURIComponent(farmer.farmerId)}">${escapeHtml(farmer.name)}</a>`;
}

function loadFarmersList() {
  fetch("data/farmers.json")
    .then((response) => response.json())
    .then((farmers) => {
      const container = document.getElementById("farmersList");
      if (!container) return;
      container.innerHTML = farmers
        .map((farmer) => {
          return `
          <article class="profile-card">
            <div class="profile-image" aria-hidden="true">${escapeHtml(farmer.name)}</div>
            <div class="card-content">
              <p class="card-tag">${escapeHtml(farmer.regionLabel)}</p>
              <h4>${escapeHtml(farmer.name)}</h4>
              <p>${escapeHtml(farmer.shortDescription)}</p>
              <div class="detail-tags">
                <span class="tag-pill">${escapeHtml(farmer.farmingStyle)}</span>
                <span class="tag-pill">${escapeHtml(farmer.mainProducts)}</span>
                <span class="status-pill">${escapeHtml(getFarmerStatusText(farmer))}</span>
              </div>
              <div class="farm-card-interest-tags">${createInterestTagsHtml(farmer, false)}</div>
              <a class="card-link" href="farmer.html?id=${encodeURIComponent(farmer.id)}">詳細を見る</a>
            </div>
          </article>`;
        })
        .join("");
    })
    .catch(() => {
      const container = document.getElementById("farmersList");
      if (container) {
        container.innerHTML = "<p>農家情報の読み込みに失敗しました。</p>";
      }
    });
}

function loadPlacesList() {
  fetch("data/places.json")
    .then((response) => response.json())
    .then((places) => {
      const container = document.getElementById("placesList");
      if (!container) return;
      const placeItems = Array.isArray(places) ? places : [];
      if (!placeItems.length) {
        container.innerHTML = '<p class="loading-text">販売店情報が見つかりませんでした。</p>';
        return;
      }
      container.innerHTML = placeItems.map(createPlaceCardHtml).join("");
    })
    .catch(() => {
      const container = document.getElementById("placesList");
      if (container) {
        container.innerHTML = "<p>販売店情報の読み込みに失敗しました。</p>";
      }
    });
}

function createPlaceCardHtml(place) {
  const handledItems = Array.isArray(place.handledItems) ? place.handledItems : [];
  const connectedFarmers = Array.isArray(place.connectedFarmers) ? place.connectedFarmers : [];
  const officialLink = place.officialUrl
    ? `<a href="${escapeAttribute(place.officialUrl)}" target="_blank" rel="noopener noreferrer">公式情報を見る</a>`
    : '<span class="place-link-placeholder">本人確認後に掲載</span>';

  return `
    <article class="place-card">
      <div class="place-card-head">
        <p class="place-kind">${escapeHtml(place.type || "地域で買える場所")}</p>
        <span class="place-status">${escapeHtml(place.statusLabel)}</span>
      </div>
      <h3>${escapeHtml(place.name)}</h3>
      <div class="place-card-summary">
        <span>種別：${escapeHtml(place.type)}</span>
        <span>地域：${escapeHtml(place.region)}</span>
      </div>
      <dl class="place-detail-list">
        <div>
          <dt>種別</dt>
          <dd>${escapeHtml(place.type)}</dd>
        </div>
        <div>
          <dt>地域</dt>
          <dd>${escapeHtml(place.region)}</dd>
        </div>
        <div>
          <dt>扱っているもの</dt>
          <dd>${escapeHtml(handledItems.join(" / ") || "本人確認後に掲載")}</dd>
        </div>
        <div>
          <dt>つながりのある農家</dt>
          <dd>${escapeHtml(connectedFarmers.join(" / ") || "本人確認後に掲載")}</dd>
        </div>
        <div>
          <dt>公式リンク</dt>
          <dd>${officialLink}</dd>
        </div>
        <div>
          <dt>掲載状態</dt>
          <dd>${escapeHtml(place.statusLabel)}</dd>
        </div>
      </dl>
      <p class="place-note">${escapeHtml(place.note)}</p>
      <button class="button tertiary place-future-button" type="button" disabled aria-disabled="true">${escapeHtml(place.mapHint || "Google Maps等への導線は将来機能")}</button>
    </article>`;
}

function loadFarmerDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = normalizeFarmerId(params.get("id"));
  if (!id) return;

  fetch("data/farmers.json")
    .then((response) => response.json())
    .then((farmers) => {
      const farmer = farmers.find((item) => item.id === id);
      const container = document.getElementById("farmerDetail");
      const pageTitle = document.getElementById("farmerName");
      if (!container) return;
      if (!farmer) {
        container.innerHTML = "<p>指定された農家が見つかりませんでした。</p>";
        return;
      }
      if (pageTitle) {
        pageTitle.textContent = farmer.name;
      }
      document.title = `${farmer.name} | 自然派やさいマップ`;
      currentDetailFarmer = farmer;
      container.innerHTML = createFarmerDetailHtml(farmer);
      setupDeferredHarvestVideos();
    })
    .catch(() => {
      const container = document.getElementById("farmerDetail");
      if (container) {
        container.innerHTML = "<p>農家情報の読み込みに失敗しました。</p>";
      }
    });
}

function createFarmerDetailHtml(farmer) {
  if (farmer.id === "yamada-nouen") {
    return createYamadaFarmerDetailHtml(farmer);
  }

  const supportWays = Array.isArray(farmer.supportWays) ? farmer.supportWays : [];
  const supportItems = supportWays
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const externalLinks = (Array.isArray(farmer.externalLinks) ? farmer.externalLinks : [])
    .map((link) => {
      const key = Object.keys(link)[0];
      return `<li><a href="${escapeAttribute(link[key])}" target="_blank" rel="noopener noreferrer">${escapeHtml(key)}</a></li>`;
    })
    .join("");
  const salesChannels = Array.isArray(farmer.salesChannels) && farmer.salesChannels.length
    ? farmer.salesChannels.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>情報なし</li>";
  const statusText = getFarmerStatusText(farmer);
  const imageSrc = getFarmerImageSrc(farmer);
  const salesSummary = summarizeSalesChannels(farmer);
  const visitSummary = summarizeVisitOptions(farmer);

  return `
    <div class="detail-back-links">
      <a href="index.html">← トップへ戻る</a>
      <a href="map.html#${encodeURIComponent(farmer.id)}">地図で場所を見る →</a>
    </div>

    <article class="detail-hero">
      <div class="detail-hero-image">
        <img src="${escapeAttribute(imageSrc)}" alt="${escapeAttribute(farmer.name)} の畑イメージ" />
        <span class="detail-region-label">${escapeHtml(farmer.regionLabel)}</span>
      </div>
      <div class="detail-summary">
        <p class="section-eyebrow">地域の農家を知る</p>
        <h2>${escapeHtml(farmer.name)}</h2>
        <p class="detail-philosophy">${escapeHtml(farmer.philosophyTitle)}</p>
        <p class="detail-summary-text">${escapeHtml(farmer.shortDescription)}</p>
        <dl class="detail-quick-facts">
          <div>
            <dt>主な作物</dt>
            <dd>${escapeHtml(farmer.mainProducts)}</dd>
          </div>
          <div>
            <dt>販売方法</dt>
            <dd>${escapeHtml(salesSummary)}</dd>
          </div>
          <div>
            <dt>訪問可否</dt>
            <dd>${escapeHtml(visitSummary)}</dd>
          </div>
        </dl>
        <div class="detail-tags">
          <span class="tag-pill">${escapeHtml(farmer.farmingStyle)}</span>
          <span class="status-pill">${escapeHtml(statusText)}</span>
        </div>
        <div class="farm-card-interest-tags detail-interest-tags">${createInterestTagsHtml(farmer, false)}</div>
      </div>
    </article>

    <aside class="detail-action-panel" aria-labelledby="detail-action-title">
      <p class="section-eyebrow">この農家とつながる</p>
      <h2 id="detail-action-title">知る・買う・訪ねる・応援する</h2>
      <p>気になる関わり方を選ぶと、将来のサービスを想定した案内を試せます。</p>
      <div class="detail-action-buttons">
        <button class="button detail-action-primary" type="button" data-demo-action="support">この農家を応援する</button>
        <button class="button detail-action-secondary" type="button" data-demo-action="sales">直売情報を見る</button>
        <button class="button detail-action-secondary" type="button" data-demo-action="visit">訪問前に確認する</button>
      </div>
      <p class="detail-demo-caption"><span>デモ</span> 現在は案内メッセージのみ表示します。</p>
    </aside>

    <div class="detail-content-grid">
      <section class="detail-support">
        <p class="section-eyebrow">人柄と営み</p>
        <h3>${escapeHtml(farmer.philosophyTitle)}</h3>
        <p>${escapeHtml(farmer.description || farmer.shortDescription)}</p>
        <h4>応援の入口</h4>
        <ul>${supportItems}</ul>
      </section>

      <section class="detail-links">
        <p class="section-eyebrow">作物と販売</p>
        <h3>育てているもの</h3>
        <p>${escapeHtml(farmer.mainProducts)}</p>
        <h3>販売先・確認先</h3>
        <ul>${salesChannels}</ul>
      </section>

      <section class="detail-notes">
        <div>
          <p class="section-eyebrow">地域に根差した野菜の情報</p>
          <h3>在来種・固定種・自家採種の扱い状況</h3>
          <p>${escapeHtml(farmer.seedTags)}</p>
        </div>
        <div>
          <p class="section-eyebrow">さらに知る</p>
          <h3>外部リンク</h3>
          <ul>${externalLinks || "<li>情報なし</li>"}</ul>
        </div>
        <div>
          <p class="section-eyebrow">掲載情報について</p>
          <h3>${escapeHtml(statusText)}</h3>
          <p>${escapeHtml(farmer.sourceNotes)}</p>
        </div>
      </section>
    </div>
  `;
}

function createYamadaFarmerDetailHtml(farmer) {
  const statusText = getFarmerStatusText(farmer);
  const video = farmer.harvestVideo || {};
  const imageSrc = getFarmerImageSrc(farmer);
  const externalLinks = (Array.isArray(farmer.externalLinks) ? farmer.externalLinks : [])
    .map((link) => {
      const key = Object.keys(link)[0];
      return `<a class="yamada-link-chip" href="${escapeAttribute(link[key])}" target="_blank" rel="noopener noreferrer">${escapeHtml(key)}</a>`;
    })
    .join("");
  const supportItems = (Array.isArray(farmer.supportWays) ? farmer.supportWays : [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const sourceNote = farmer.profileSummary || farmer.sourceNotes || "公開情報をもとに作成しています。最新情報は公式情報をご確認ください。";

  return `
    <div class="yamada-profile-shell">
      <div class="detail-back-links yamada-detail-back">
        <a href="index.html">← トップへ戻る</a>
        <a href="map.html#${encodeURIComponent(farmer.id)}">地域マップで見る →</a>
      </div>

      <article class="yamada-hero-card">
        <div class="yamada-hero-image">
          <img src="${escapeAttribute(imageSrc)}" alt="${escapeAttribute(farmer.name)}の畑イメージ" />
          <span class="status-pill">${escapeHtml(statusText)}</span>
        </div>
        <div class="yamada-hero-copy">
          <p class="section-eyebrow">農家プロフィール</p>
          <h1>${escapeHtml(farmer.name)}</h1>
          <p class="yamada-area">${escapeHtml(farmer.area)}</p>
          <p>${escapeHtml(farmer.shortDescription)}</p>
        </div>
      </article>

      <section class="yamada-harvest-card" aria-labelledby="yamada-video-title">
        <div class="yamada-section-head">
          <p class="section-eyebrow">QRコードから見る入口</p>
          <h2 id="yamada-video-title">最近の収穫動画</h2>
        </div>
        <div class="harvest-video-shell" data-video-shell>
          <video
            class="harvest-video"
            data-harvest-video
            data-video-src="${escapeAttribute(video.src || "assets/videos/yamada-harvest-2025-06-16.mp4")}"
            poster="${escapeAttribute(imageSrc)}"
            controls
            muted
            playsinline
            preload="none"
            hidden
          ></video>
          <div class="harvest-video-placeholder" data-video-placeholder>
            <span>動画差し替え待ち</span>
            <p>動画ファイルを配置すると、ここに収穫の様子が表示されます。</p>
            <small>${escapeHtml(video.src || "assets/videos/yamada-harvest-2025-06-16.mp4")}</small>
          </div>
        </div>
        <div class="harvest-video-caption">
          <strong>${escapeHtml(video.title || "今朝の収穫の様子")}</strong>
          <span>${escapeHtml(video.dateLabel || "2025年6月16日")}</span>
        </div>
      </section>

      <div class="yamada-harvest-links">
        <a class="yamada-large-link" href="${escapeAttribute(video.galleryUrl || "harvest-yamada-2025-06-16.html")}">
          <span>2025年6月16日の収穫風景</span>
          <strong>写真ギャラリーを見る</strong>
        </a>
        <a class="yamada-archive-link" href="${escapeAttribute(video.archiveUrl || "harvest-archive.html")}">
          <span>過去の収穫風景</span>
          <strong>これまでの記録を見る</strong>
        </a>
      </div>

      <section class="yamada-story-card">
        <p class="section-eyebrow">農園の想い</p>
        <h2>${escapeHtml(farmer.philosophyTitle)}</h2>
        <p>${escapeHtml(farmer.description)}</p>
        <p class="yamada-source-note">${escapeHtml(sourceNote)}</p>
      </section>

      <section class="yamada-info-card">
        <p class="section-eyebrow">基本情報</p>
        <dl>
          <div>
            <dt>地域</dt>
            <dd>${escapeHtml(farmer.area)}</dd>
          </div>
          <div>
            <dt>作り手</dt>
            <dd>${escapeHtml(farmer.ownerName || "山田晃太郎さん")}</dd>
          </div>
          <div>
            <dt>主な作物</dt>
            <dd>${escapeHtml(farmer.mainProducts)}</dd>
          </div>
          <div>
            <dt>直販</dt>
            <dd>${escapeHtml(summarizeSalesChannels(farmer))}</dd>
          </div>
        </dl>
        <ul>${supportItems}</ul>
      </section>

      <section class="yamada-links-card">
        <p class="section-eyebrow">関連リンク</p>
        <h2>最新情報は公式情報へ</h2>
        <div class="yamada-link-list">
          ${externalLinks || "<span>関連リンクは準備中です。</span>"}
        </div>
      </section>

      <section class="yamada-future-card">
        <p class="section-eyebrow">将来の導線</p>
        <h2>今日の一皿カードへつなげる構想</h2>
        <p>メニュー表のQRから収穫動画、農家プロフィール、今日の一皿カードへ進む流れを想定しています。プレート名、店名、農園名、店主の想い、ハッシュタグ、農家ページへのQRを、あとから追加できるようにします。</p>
      </section>
    </div>
  `;
}

function normalizeFarmerId(id) {
  const aliases = {
    "model-nouen": "model-shizen-nouen",
  };
  return aliases[id] || id;
}

function setupDemoActionDialog() {
  const dialog = document.getElementById("demoActionDialog");
  if (!dialog) return;

  const farmerName = document.getElementById("demoModalFarmer");
  const title = document.getElementById("demoModalTitle");
  const message = document.getElementById("demoModalMessage");

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-demo-action]");
    if (!trigger || !currentDetailFarmer) return;

    const action = trigger.dataset.demoAction;
    const content = getDemoActionContent(action, currentDetailFarmer);
    farmerName.textContent = currentDetailFarmer.name;
    title.textContent = content.title;
    message.textContent = content.message;
    lastDemoTrigger = trigger;
    document.body.classList.add("modal-open");

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-demo-close]")) {
      closeDialog(dialog);
    }
  });

  dialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    if (lastDemoTrigger) lastDemoTrigger.focus();
  });

  dialog.addEventListener("cancel", () => {
    document.body.classList.remove("modal-open");
  });
}

function setupAiProfileDemoDialog() {
  const dialog = document.getElementById("aiProfileDemoDialog");
  const trigger = document.querySelector("[data-ai-profile-demo]");
  if (!dialog || !trigger) return;

  trigger.addEventListener("click", () => {
    lastAiDemoTrigger = trigger;
    document.body.classList.add("modal-open");
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-ai-demo-close]")) {
      closeDialog(dialog);
    }
  });

  dialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    if (lastAiDemoTrigger) lastAiDemoTrigger.focus();
  });

  dialog.addEventListener("cancel", () => {
    document.body.classList.remove("modal-open");
  });
}

function setupConceptDemoDialog() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-concept-demo]");
    if (!trigger) return;
    openConceptDemo(
      trigger.dataset.conceptTitle || "将来構想",
      trigger.dataset.conceptMessage || "現在は構想デモです。実際のAI機能、フォーム送信、ポイント付与、QR読み取り、ログイン、決済連携、DB保存はまだ動作しません。",
      trigger
    );
  });
}

function openConceptDemo(titleText, messageText, trigger) {
  const dialog = getConceptDemoDialog();
  const title = dialog.querySelector("[data-concept-demo-title]");
  const message = dialog.querySelector("[data-concept-demo-message]");
  if (title) title.textContent = titleText;
  if (message) message.textContent = messageText;
  lastConceptDemoTrigger = trigger || null;
  document.body.classList.add("modal-open");
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function getConceptDemoDialog() {
  let dialog = document.getElementById("conceptDemoDialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "conceptDemoDialog";
  dialog.className = "demo-modal concept-demo-modal";
  dialog.setAttribute("aria-labelledby", "conceptDemoTitle");
  dialog.innerHTML = `
    <div class="demo-modal-card">
      <button class="demo-modal-x" type="button" data-concept-demo-close aria-label="モーダルを閉じる">×</button>
      <p class="demo-modal-farmer">構想デモ・工事中</p>
      <h2 id="conceptDemoTitle" data-concept-demo-title>将来構想</h2>
      <p class="demo-modal-message" data-concept-demo-message>現在は構想デモです。実際の機能はまだ動作しません。</p>
      <div class="demo-modal-note">
        <strong>まだ実装していません。</strong>
        <p>この画面は、将来の使い方を伝えるための見た目だけのデモです。送信、保存、AI API連携、ポイント付与は行いません。</p>
      </div>
      <button class="button demo-modal-confirm" type="button" data-concept-demo-close>閉じる</button>
    </div>
  `;
  document.body.appendChild(dialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-concept-demo-close]")) {
      closeDialog(dialog);
    }
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    if (lastConceptDemoTrigger) lastConceptDemoTrigger.focus();
  });
  dialog.addEventListener("cancel", () => {
    document.body.classList.remove("modal-open");
  });
  return dialog;
}

function setupDeferredHarvestVideos() {
  const videos = Array.from(document.querySelectorAll("[data-video-src]"));
  videos.forEach((video) => {
    if (video.dataset.videoReady === "true") return;
    video.dataset.videoReady = "true";
    const src = video.dataset.videoSrc;
    const shell = video.closest("[data-video-shell]");
    const placeholder = shell ? shell.querySelector("[data-video-placeholder]") : null;
    if (!src || video.dataset.videoAvailable !== "true") {
      showVideoPlaceholder(video, placeholder);
      return;
    }

    fetch(src, { method: "HEAD" })
      .then((response) => {
        if (!response.ok) {
          showVideoPlaceholder(video, placeholder);
          return;
        }
        video.src = src;
        video.hidden = false;
        if (placeholder) placeholder.hidden = true;
        video.load();
      })
      .catch(() => {
        showVideoPlaceholder(video, placeholder);
      });
  });
}

function showVideoPlaceholder(video, placeholder) {
  video.hidden = true;
  video.removeAttribute("src");
  if (placeholder) placeholder.hidden = false;
}

function setupHarvestVideoPage() {
  const profileLink = document.querySelector("[data-harvest-profile-link]");
  const video = document.querySelector("[data-harvest-video]");
  const params = new URLSearchParams(window.location.search);
  const farmerId = params.get("farmer") || "yamada-nouen";
  const profileUrl = `farmer.html?id=${encodeURIComponent(farmerId)}`;

  if (profileLink) {
    profileLink.setAttribute("href", profileUrl);
  }
  if (video) {
    video.addEventListener("ended", () => {
      window.location.href = profileUrl;
    });
  }
}

function setupProfileInterviewDemo() {
  const questionText = document.querySelector("[data-profile-question]");
  const nextButton = document.querySelector("[data-next-profile-question]");
  const prevButton = document.querySelector("[data-prev-profile-question]");
  const answerInput = document.querySelector("[data-profile-answer]");
  const startButton = document.querySelector("[data-start-profile-interview]");
  const workspace = document.querySelector("[data-interview-workspace]");
  const current = document.querySelector("[data-question-current]");
  const total = document.querySelector("[data-question-total]");
  const listItems = Array.from(document.querySelectorAll("[data-profile-question-list] li"));
  const preview = document.querySelector("[data-answer-preview]");
  const buildButton = document.querySelector("[data-build-profile-draft]");
  const draftSection = document.querySelector("[data-profile-draft-section]");
  const draftStatus = document.querySelector("[data-profile-draft-status]");
  const tagContainer = document.querySelector("[data-draft-tags]");
  const memoContainer = document.querySelector("[data-expression-memo]");
  const checklistContainer = document.querySelector("[data-draft-checklist]");
  const editButton = document.querySelector("[data-draft-edit-note]");
  const resetButton = document.querySelector("[data-reset-profile-interview]");
  if (!questionText || !nextButton || !prevButton || !answerInput || !listItems.length) return;

  const questions = listItems
    .map((item) => ({
      label: item.dataset.questionLabel || item.textContent.trim(),
      question: item.textContent.trim(),
    }))
    .filter((item) => item.question);
  const answers = new Array(questions.length).fill("");
  let index = 0;
  if (total) total.textContent = String(questions.length);

  const saveCurrentAnswer = () => {
    answers[index] = answerInput.value.trim();
  };

  const renderQuestion = () => {
    questionText.textContent = questions[index].question;
    answerInput.value = answers[index] || "";
    if (current) current.textContent = String(index + 1);
    prevButton.disabled = index === 0;
    nextButton.hidden = index === questions.length - 1;
    if (buildButton) buildButton.hidden = index !== questions.length - 1;
    listItems.forEach((item, itemIndex) => {
      item.classList.toggle("is-active", itemIndex === index);
      item.classList.toggle("is-answered", Boolean(answers[itemIndex]));
    });
    renderAnswerPreview();
  };

  const renderAnswerPreview = () => {
    if (!preview) return;
    preview.innerHTML = questions
      .map((item, itemIndex) => {
        const answer = answers[itemIndex];
        return `
          <div class="${answer ? "is-answered" : "is-empty"}">
            <dt>${escapeHtml(item.label)}</dt>
            <dd>${answer ? escapeHtml(answer) : "未回答"}</dd>
          </div>`;
      })
      .join("");
  };

  const showWorkspace = () => {
    if (workspace) workspace.hidden = false;
    renderQuestion();
    answerInput.focus();
  };

  if (startButton) {
    startButton.addEventListener("click", showWorkspace);
  } else {
    showWorkspace();
  }

  answerInput.addEventListener("input", () => {
    saveCurrentAnswer();
    renderAnswerPreview();
    listItems[index].classList.toggle("is-answered", Boolean(answers[index]));
  });

  prevButton.addEventListener("click", () => {
    saveCurrentAnswer();
    index = Math.max(0, index - 1);
    renderQuestion();
  });

  nextButton.addEventListener("click", () => {
    saveCurrentAnswer();
    index = Math.min(questions.length - 1, index + 1);
    renderQuestion();
  });

  if (buildButton) {
    buildButton.addEventListener("click", async () => {
      saveCurrentAnswer();
      const originalLabel = buildButton.textContent;
      buildButton.disabled = true;
      buildButton.textContent = "下書きを作成中...";
      let draftResult;
      try {
        draftResult = await requestProfileDraft(answers);
      } catch (error) {
        draftResult = createFallbackProfileDraftResult(answers);
      }
      renderProfileDraft(draftResult.draft, draftSection, tagContainer, memoContainer, checklistContainer);
      updateProfileDraftStatus(draftStatus, draftResult);
      buildButton.disabled = false;
      buildButton.textContent = originalLabel;
      if (draftSection) {
        draftSection.hidden = false;
        draftSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (editButton) {
    editButton.addEventListener("click", () => {
      const firstField = document.querySelector("[data-draft-field]");
      if (firstField) firstField.focus();
      openConceptDemo("下書きを修正する", "下書き欄を直接修正できます。このデモでは修正内容の送信・保存はまだ行いません。", editButton);
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      answers.fill("");
      index = 0;
      if (draftSection) draftSection.hidden = true;
      updateProfileDraftStatus(draftStatus, null);
      renderQuestion();
      if (workspace) workspace.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  renderQuestion();
}

async function requestProfileDraft(answers) {
  if (!shouldRequestProfileDraftApi()) {
    throw new Error("profile draft api is not available on local static server");
  }
  const response = await fetch("/api/profile-draft", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      answers: createProfileDraftAnswersPayload(answers),
    }),
  });
  if (!response.ok) {
    throw new Error("profile draft api failed");
  }
  const result = await response.json();
  if (!result || !result.ok || !result.draft) {
    throw new Error("profile draft api returned invalid response");
  }
  const mode = result.mode || "mock";
  return {
    source: mode === "openai" ? "api" : mode === "mock-fallback" ? "fallback" : "mock",
    mode,
    note: getProfileDraftStatusNote(mode, result.note),
    draft: normalizeProfileDraft(result.draft),
  };
}

function shouldRequestProfileDraftApi() {
  const staticServerPorts = new Set(["8000", "8010", "8020"]);
  return !(["localhost", "127.0.0.1"].includes(window.location.hostname) && staticServerPorts.has(window.location.port));
}

function createProfileDraftAnswersPayload(answers) {
  return {
    farmName: answers[0] || "",
    area: answers[1] || "",
    crops: answers[2] || "",
    values: answers[3] || "",
    cultivation: answers[4] || "",
    localConnection: answers[5] || "",
    future: answers[6] || "",
    message: answers[7] || "",
  };
}

function createFallbackProfileDraftResult(answers) {
  return {
    source: "fallback",
    mode: "browser-mock",
    note: "API接続に失敗したため、ブラウザ内のデモ生成で表示しています。",
    draft: buildProfileDraftFromAnswers(answers),
  };
}

function buildProfileDraftFromAnswers(answers) {
  const getAnswer = (position, fallback) => answers[position] || fallback;
  const farmName = getAnswer(0, "〇〇農園");
  const area = getAnswer(1, "地域未入力");
  const crops = getAnswer(2, "育てているものは未入力です。");
  const importantThings = [answers[3], answers[7]].filter(Boolean).join("\n\n") || "作物を育てるうえで大切にしていることは、本人確認時に追記します。";
  const cultivation = answers[4] || "栽培方法については、農家さん本人の確認後に掲載します。";
  const localConnection = answers[5] || "地域との関わりについては、本人確認時に整理します。";
  const future = answers[6] || "これから目指したいことは、本人確認時に整理します。";
  const message = answers[7] || "農家さんの想いは、本人確認時に追記します。";
  const restaurantMaterial = `${farmName}は、${area}で${crops}を育てる農園です。${importantThings.replace(/\n+/g, " ")} 販売店・飲食店で紹介する際は、栽培方法や販売方法を農家さん本人に確認したうえで掲載します。`;

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
    restaurantMaterial,
    tagCandidates: createProfileTagCandidates(answers),
    expressionMemo: createExpressionMemos(answers.join("\n")),
    checklist: getDefaultProfileDraftChecklist(),
  };
}

function normalizeProfileDraft(draft) {
  return {
    status: draft.status || "下書き・本人確認前",
    farmName: draft.farmName || "〇〇農園",
    area: draft.area || "地域未入力",
    crops: draft.crops || "育てているものは未入力です。",
    importantThings: draft.importantThings || "作物を育てるうえで大切にしていることは、本人確認時に追記します。",
    cultivation: draft.cultivation || "栽培方法については、農家さん本人の確認後に掲載します。",
    localConnection: draft.localConnection || "地域との関わりについては、本人確認時に整理します。",
    future: draft.future || "これから目指したいことは、本人確認時に整理します。",
    message: draft.message || "農家さんの想いは、本人確認時に追記します。",
    restaurantMaterial: draft.restaurantMaterial || "販売店・飲食店向け紹介素材は、本人確認後に整理します。",
    tagCandidates: Array.isArray(draft.tagCandidates) ? draft.tagCandidates : [],
    expressionMemo: Array.isArray(draft.expressionMemo) ? draft.expressionMemo : [],
    checklist: Array.isArray(draft.checklist) ? draft.checklist : [],
  };
}

function updateProfileDraftStatus(statusElement, result) {
  if (!statusElement) return;
  if (!result) {
    statusElement.hidden = true;
    statusElement.textContent = "";
    statusElement.classList.remove("is-fallback", "is-api");
    return;
  }
  statusElement.hidden = false;
  statusElement.textContent = result.note;
  statusElement.classList.toggle("is-api", result.source === "api");
  statusElement.classList.toggle("is-fallback", result.source === "fallback");
}

function getProfileDraftStatusNote(mode, fallbackNote) {
  if (mode === "openai") {
    return "プロフィール下書きを生成しました。掲載前に農家さん本人の確認が必要です。";
  }
  if (mode === "mock") {
    return "現在はデモ生成で表示しています。";
  }
  if (mode === "mock-fallback") {
    return "API接続に失敗したため、デモ生成で表示しています。";
  }
  return fallbackNote || "現在はデモ生成で表示しています。";
}

function renderProfileDraft(draft, draftSection, tagContainer, memoContainer, checklistContainer) {
  if (!draftSection) return;
  const normalizedDraft = normalizeProfileDraft(draft);

  setDraftField("farmName", normalizedDraft.farmName);
  setDraftField("region", normalizedDraft.area);
  setDraftField("products", normalizedDraft.crops);
  setDraftField("values", normalizedDraft.importantThings);
  setDraftField("cultivation", normalizedDraft.cultivation);
  setDraftField("community", normalizedDraft.localConnection);
  setDraftField("future", normalizedDraft.future);
  setDraftField("message", normalizedDraft.message);
  setDraftField("businessCopy", normalizedDraft.restaurantMaterial);

  const tags = normalizedDraft.tagCandidates;
  if (tagContainer) {
    tagContainer.innerHTML = tags.length
      ? tags.map((tag) => `<span>${escapeHtml(tag)}<small>候補</small></span>`).join("")
      : '<p class="draft-empty-note">回答内容を確認したうえで、運営側が手動でタグを調整します。</p>';
  }

  if (memoContainer) {
    memoContainer.innerHTML = createExpressionMemoHtml(normalizedDraft.expressionMemo);
  }

  if (checklistContainer) {
    const checklist = normalizedDraft.checklist.length ? normalizedDraft.checklist : getDefaultProfileDraftChecklist();
    checklistContainer.innerHTML = checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
}

function setDraftField(name, value) {
  const field = document.querySelector(`[data-draft-field="${name}"]`);
  if (field) field.value = value;
}

function createProfileTagCandidates(answers) {
  const text = answers.join(" ");
  const products = answers[2] || "";
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

function createExpressionMemos(text) {
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

function createExpressionMemoHtml(memosOrText) {
  const memos = Array.isArray(memosOrText) ? memosOrText : createExpressionMemos(String(memosOrText || ""));
  return memos.map((memo) => `<p>${escapeHtml(memo)}</p>`).join("");
}

function getDefaultProfileDraftChecklist() {
  return [
    "農家さん本人が内容を確認する",
    "栽培方法の表現を確認する",
    "販売方法・連絡方法を確認する",
    "訪問・体験の可否を確認する",
    "公開してよい写真やURLを確認する",
    "本人確認後に掲載する",
  ];
}

function getDemoActionContent(action, farmer) {
  if (action === "sales") {
    return {
      title: "直売情報を見る",
      message: farmer.isModel
        ? "この表示はデモです。将来的には、農家さん本人の確認後に、直売・定期便・イベント出店などの確認先を整理する想定です。"
        : `${summarizeSalesChannels(farmer)}。将来的には、公式情報をもとに直売・定期便・イベント出店などの確認先を整理する想定です。`,
    };
  }
  if (action === "visit") {
    return {
      title: "訪問前に確認する",
      message: farmer.isModel
        ? "この表示はデモです。訪問や体験の可否は、個別農家さんの確認後に掲載する想定です。"
        : `${summarizeVisitOptions(farmer)}。訪問可否や体験日程は、農家さんの公式情報を確認する導線として整理する想定です。`,
    };
  }
  return {
    title: "この農家を応援する",
    message: `${farmer.philosophyTitle}という想いに共感した人が、活動を知る・購入先を確認する・体験の可否を尋ねる入口につながれる機能を想定しています。`,
  };
}

function loadSeedsMap() {
  fetch("data/seeds.json")
    .then((response) => response.json())
    .then((seeds) => {
      const seedItems = Array.isArray(seeds) ? seeds : [];
      renderSeedMap(seedItems);
      if (seedItems.length) {
        selectSeed(seedItems[0]);
      }
    })
    .catch(() => {
      const panel = document.getElementById("seedInfoPanel");
      if (panel) {
        panel.innerHTML = "<p>地域品種の情報の読み込みに失敗しました。</p>";
      }
    });
}

function renderSeedMap(seeds) {
  const canvas = document.getElementById("seedMapCanvas");
  const list = document.getElementById("seedList");
  if (!canvas || !list) return;

  canvas.innerHTML = `
    <div class="seed-map-base" role="img" aria-label="茨城県全域に登録された地域品種の地域目安を表示する地図">
      <span class="seed-map-area-label label-north">県北</span>
      <span class="seed-map-area-label label-central">水戸周辺</span>
      <span class="seed-map-area-label label-south">県南</span>
      <span class="seed-map-area-label label-west">県西</span>
      <span class="seed-map-area-label label-east">鹿行</span>
      <span class="seed-map-outline" aria-hidden="true"></span>
    </div>
    ${seeds
      .map((seed) => {
        const position = getSeedPinPosition(seed);
        const sourceType = getSeedSourceType(seed);
        return `<button class="seed-pin source-${escapeAttribute(sourceType)}" type="button" data-seed-id="${escapeAttribute(seed.id)}" data-source-type="${escapeAttribute(sourceType)}" style="left:${position.left}%; top:${position.top}%;">
          <span>${escapeHtml(getSeedSourceLabel(seed))}</span>
          <strong>${escapeHtml(seed.name)}</strong>
        </button>`;
      })
      .join("")}
  `;

  list.innerHTML = seeds
    .map((seed) => createSeedListCardHtml(seed))
    .join("");

  const handleSelect = (event) => {
    const trigger = event.target.closest("[data-seed-id]");
    if (!trigger) return;
    const seed = seeds.find((item) => item.id === trigger.dataset.seedId);
    if (seed) selectSeed(seed);
  };

  canvas.addEventListener("click", handleSelect);
  list.addEventListener("click", handleSelect);
}

function selectSeed(seed) {
  const panel = document.getElementById("seedInfoPanel");
  if (!panel) return;

  document.querySelectorAll("[data-seed-id]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.seedId === seed.id);
  });

  const sourceLink = seed.sourceUrl
    ? `<a href="${escapeAttribute(seed.sourceUrl)}" target="_blank" rel="noopener noreferrer">出典リンクを開く</a>`
    : "<span>出典リンク未確認</span>";
  const aliases = Array.isArray(seed.aliases) && seed.aliases.length ? seed.aliases.join(" / ") : "別名未整理";
  const sourceLabel = getSeedSourceLabel(seed);

  panel.innerHTML = `
    <p class="section-eyebrow">選択中の地域品種</p>
    <h3>${escapeHtml(seed.name)}</h3>
    <dl class="seed-detail-list">
      <div>
        <dt>別名</dt>
        <dd>${escapeHtml(aliases)}</dd>
      </div>
      <div>
        <dt>地域</dt>
        <dd>${escapeHtml(seed.area)}</dd>
      </div>
      <div>
        <dt>分類</dt>
        <dd>${escapeHtml(seed.cropType)}</dd>
      </div>
      <div>
        <dt>情報種別</dt>
        <dd><span class="seed-source-badge source-${escapeAttribute(getSeedSourceType(seed))}">${escapeHtml(sourceLabel)}</span></dd>
      </div>
      <div>
        <dt>出典</dt>
        <dd>${escapeHtml(seed.sourceName)}</dd>
      </div>
      <div>
        <dt>公式リンク</dt>
        <dd>${sourceLink}</dd>
      </div>
      <div>
        <dt>確認状態</dt>
        <dd>${escapeHtml(seed.dataConfidence || sourceLabel)}</dd>
      </div>
    </dl>
    <p class="seed-note">${escapeHtml(seed.descriptionShort || seed.note || "")}</p>
    <p class="seed-location-note">${escapeHtml(seed.locationNote || "位置は地域の目安です。正確な圃場所在地ではありません。")}</p>
  `;
}

function createSeedListCardHtml(seed) {
  const aliases = Array.isArray(seed.aliases) && seed.aliases.length ? seed.aliases.join(" / ") : "別名未整理";
  const sourceLink = seed.sourceUrl
    ? `<a href="${escapeAttribute(seed.sourceUrl)}" target="_blank" rel="noopener noreferrer">出典リンク</a>`
    : '<span class="seed-link-placeholder">出典リンク未確認</span>';
  const sourceType = getSeedSourceType(seed);
  const sourceLabel = getSeedSourceLabel(seed);
  return `
    <article class="seed-list-card source-${escapeAttribute(sourceType)}" data-seed-id="${escapeAttribute(seed.id)}">
      <button class="seed-card-select" type="button" data-seed-id="${escapeAttribute(seed.id)}">
        <span class="seed-source-badge source-${escapeAttribute(sourceType)}">${escapeHtml(sourceLabel)}</span>
        <strong>${escapeHtml(seed.name)}</strong>
        <small>${escapeHtml(seed.area)} / ${escapeHtml(seed.cropType)}</small>
      </button>
      <dl class="seed-card-meta">
        <div>
          <dt>別名</dt>
          <dd>${escapeHtml(aliases)}</dd>
        </div>
        <div>
          <dt>分類</dt>
          <dd>${escapeHtml(seed.cropType)}</dd>
        </div>
        <div>
          <dt>出典</dt>
          <dd>${escapeHtml(seed.sourceName || "出典未整理")}</dd>
        </div>
        <div>
          <dt>公式リンク</dt>
          <dd>${sourceLink}</dd>
        </div>
      </dl>
      <p>${escapeHtml(seed.descriptionShort || "")}</p>
      <p class="seed-card-location">${escapeHtml(seed.locationNote || "位置は地域の目安です。正確な圃場所在地ではありません。")}</p>
    </article>`;
}

function getSeedSourceType(seed) {
  const allowed = ["public_database", "local_material", "farmer_verified", "research_needed"];
  return allowed.includes(seed.sourceType) ? seed.sourceType : "research_needed";
}

function getSeedSourceLabel(seed) {
  const fallback = {
    public_database: "公的DB掲載情報",
    local_material: "地域資料・要確認",
    farmer_verified: "農家本人確認済み",
    research_needed: "調査中・本人確認前",
  };
  return seed.sourceLabel || seed.statusLabel || fallback[getSeedSourceType(seed)];
}

function summarizeSalesChannels(farmer) {
  const channels = Array.isArray(farmer.salesChannels) ? farmer.salesChannels : [];
  if (!channels.length) return "詳細ページで確認";
  return channels.length > 1 ? `${channels[0]} ほか` : channels[0];
}

function summarizeVisitOptions(farmer) {
  if (farmer.isModel) return "デモ表示・事前確認";
  const ways = Array.isArray(farmer.supportWays) ? farmer.supportWays : [];
  const text = ways.join(" ");
  if (text.includes("体験") || text.includes("訪問")) return "公式情報で要確認";
  if (text.includes("イベント")) return "イベント情報を要確認";
  return "訪問前に要確認";
}

function getFarmerImageSrc(farmer) {
  const imageMap = {
    "yamada-nouen": "assets/farm-yamada-cover.png",
    "model-shizen-nouen": "assets/seedlings-cover.png",
  };
  return imageMap[farmer.id] || "assets/farm-yamada-cover.png";
}

function getFarmerStatusText(farmer) {
  if (farmer.isModel) return "デモ表示・個別農家を特定するものではありません";
  if (farmer.verifiedByFarmer) return "本人確認済み";
  return "公開情報をもとに作成・本人確認前";
}

function getInterestLabels(farmer) {
  return Array.isArray(farmer.interestLabels) ? farmer.interestLabels : [];
}

function getInterestMatchCount(farmer) {
  if (!selectedInterestLabels.size) return 0;
  return getInterestLabels(farmer).filter((label) => selectedInterestLabels.has(label)).length;
}

function createInterestMatchSummaryHtml(farmer, matchCount) {
  if (!selectedInterestLabels.size) return "";
  const matchedLabels = getInterestLabels(farmer).filter((label) => selectedInterestLabels.has(label));
  if (!matchedLabels.length) return "";
  const matchedText = matchedLabels.map(escapeHtml).join("／");
  return `
    <div class="farm-card-match-summary">
      <span>あなたの関心と重なる点：</span>
      <p>${matchedText}</p>
      <small>選択した価値観と${matchCount}件一致</small>
    </div>`;
}

function createInterestTagsHtml(farmer, markMatches) {
  const labels = getInterestLabels(farmer);
  if (!labels.length) return '<span class="interest-tag">価値観タグ未設定</span>';
  return labels
    .map((label) => {
      const matchedClass = markMatches && selectedInterestLabels.has(label) ? " is-matched" : "";
      return `<span class="interest-tag${matchedClass}">${escapeHtml(label)}</span>`;
    })
    .join("");
}

function getSeedPinPosition(seed) {
  const bounds = {
    latMin: 35.8,
    latMax: 36.95,
    lngMin: 139.7,
    lngMax: 141.1,
  };
  const lng = Number(seed.lng);
  const lat = Number(seed.lat);
  const left = ((lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * 100;
  const top = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * 100;
  return {
    left: clamp(left, 8, 92).toFixed(1),
    top: clamp(top, 10, 90).toFixed(1),
  };
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return 50;
  return Math.min(Math.max(value, min), max);
}

function closeDialog(dialog) {
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
    document.body.classList.remove("modal-open");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
