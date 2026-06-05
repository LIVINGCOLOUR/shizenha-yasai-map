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

  if (isPage("farmers")) {
    loadFarmersList();
  }
  if (isPage("places")) {
    loadPlacesList();
  }
  if (isPage("farmer")) {
    loadFarmerDetail();
  }
  if (isPage("index")) {
    setupInterestFilters();
    loadHomepageFarmers();
  }
  if (isPage("seeds")) {
    loadSeedsMap();
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
    })
    .catch(() => {
      const container = document.getElementById("farmerDetail");
      if (container) {
        container.innerHTML = "<p>農家情報の読み込みに失敗しました。</p>";
      }
    });
}

function createFarmerDetailHtml(farmer) {
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
          <p class="section-eyebrow">たねの情報</p>
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
    const dialog = getConceptDemoDialog();
    const title = dialog.querySelector("[data-concept-demo-title]");
    const message = dialog.querySelector("[data-concept-demo-message]");
    if (title) title.textContent = trigger.dataset.conceptTitle || "将来構想";
    if (message) {
      message.textContent = "現在は構想デモです。実際のAI機能、フォーム送信、ポイント付与、QR読み取り、ログイン、決済連携、DB保存はまだ動作しません。";
    }
    lastConceptDemoTrigger = trigger;
    document.body.classList.add("modal-open");
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  });
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
        panel.innerHTML = "<p>たね情報の読み込みに失敗しました。</p>";
      }
    });
}

function renderSeedMap(seeds) {
  const canvas = document.getElementById("seedMapCanvas");
  const list = document.getElementById("seedList");
  if (!canvas || !list) return;

  canvas.innerHTML = `
    <div class="seed-map-base" role="img" aria-label="茨城県全域に登録されたたねの地域目安を表示する地図">
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
    <p class="section-eyebrow">選択中のたね</p>
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
