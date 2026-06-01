(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // EasyPay — «Спросить ИИ: подойдёт ли это вам»
  //
  // Кнопки открывают ChatGPT / Claude с уже набранным промптом. Промпт
  // превращает чужой ИИ в ЧЕСТНОГО консультанта по cross-border платежам:
  // он сначала расспрашивает посетителя про его кейс, потом честно говорит,
  // подходит EasyPay или нет (включая «не ваш случай»), и при фите ведёт
  // в онбординг-бот.
  //
  // ВАЖНО: чужой ИИ не знает про EasyPay и без фактов начнёт выдумывать
  // комиссии/KYC. Поэтому проверенная справка ЗАШИТА прямо в промпт, плюс
  // явный запрет выдумывать цифры. Справку правим здесь, в одном месте.
  // Источник: sales/knowledge/easypay/positioning.md (v0.2, MoR) + icp-hypotheses.md
  // ─────────────────────────────────────────────────────────────────────────

  var BOT_URL = "https://t.me/easypay_onboarding_bot";

  // Заземлённый фактблок. НИЧЕГО про точные комиссии/KYC-детали — только модель.
  var FACTS =
    "Проверенная справка о EasyPay (опирайся ТОЛЬКО на неё; не выдумывай комиссии, " +
    "условия KYC и регуляторные нюансы — если данных ниже нет, прямо скажи об этом и " +
    "отправь уточнить в онбординг-бот):\n" +
    "- Что это: Merchant of Record (MoR) для cross-border digital-бизнеса из/в РФ и СНГ. " +
    "EasyPay юридически становится продавцом между бизнесом и его конечным покупателем.\n" +
    "- Что делает: принимает платежи разными методами в одной ссылке (карты через Stripe, " +
    "СБП/Т-Банк, криптовалюта, инвойс Mercury); выплачивает деньги партнёру без необходимости " +
    "открывать своё зарубежное юрлицо и счёт; берёт на себя chargeback/dispute-процессы и " +
    "категорийный compliance под нестандартные ниши.\n" +
    "- Кому обычно подходит: SaaS/AI-продукты с подписками (как альтернатива Paddle/Lemon Squeezy); " +
    "бизнес, которого банил Stripe/PayPal в рисковой нише (visa-консалтинг, dating и т.п.); " +
    "устоявшийся cross-border бизнес, который хочет изолировать риск нового направления от основного аккаунта.\n" +
    "- Кому НЕ подходит: gambling и чистый adult; бизнес только внутри РФ без зарубежных клиентов; " +
    "разовые платежи без регулярного потока; крупный enterprise; те, кто хочет просто принимать деньги, " +
    "не передавая EasyPay юридическую роль продавца.\n" +
    "- Сколько стоит: модель — процент с оборота. Точные комиссии зависят от географии, валюты и метода " +
    "оплаты и показываются в онбординг-боте под конкретный кейс.\n" +
    "- Где попробовать без карты и регистрации: онбординг-бот в Telegram " + BOT_URL + " , сайт {url}.";

  // Сегментные подсказки — добавляют одну строку «контекст обо мне».
  // Управляется атрибутом data-agent-segment на контейнере.
  var SEGMENTS = {
    "default": "",
    "saas":
      "Контекст обо мне: у меня SaaS/AI-продукт с подписками, присматриваюсь к Merchant of Record " +
      "вместо Paddle / собственного Stripe.",
    "stripe-ban":
      "Контекст обо мне: меня уже банил Stripe или PayPal в моей нише, ищу стабильный канал приёма платежей.",
    "infobiz":
      "Контекст обо мне: я продаю онлайн-курсы / консультации, в основном русскоязычной аудитории, " +
      "и иногда иностранным клиентам.",
    "ecom":
      "Контекст обо мне: у меня e-commerce / товарный бизнес с подпиской или регулярными продажами за рубеж."
  };

  function buildPrompt(url, segmentKey) {
    var facts = FACTS.replace("{url}", url || "easypay.thenextgen.store");
    var hint = SEGMENTS[segmentKey] || SEGMENTS["default"];

    return (
      "Ты — независимый консультант по приёму трансграничных (cross-border) платежей. " +
      "Я зашёл на сайт EasyPay (" + (url || "easypay.thenextgen.store") + ") и хочу честно понять, " +
      "подходит ли этот сервис под мою ситуацию. Не уговаривай меня — помоги трезво разобраться.\n\n" +
      facts + "\n\n" +
      (hint ? hint + "\n\n" : "") +
      "Действуй так:\n" +
      "1. Сначала задай мне 3–4 коротких вопроса про мою ситуацию: откуда и куда идут платежи, " +
      "примерный объём в месяц, как я принимаю оплату сейчас и что в этом ломается.\n" +
      "2. Дождись моих ответов и честно скажи, похоже ли это на кейс EasyPay — включая «не подходит, если…». " +
      "Если это не мой случай, прямо скажи об этом и подскажи, что подошло бы лучше.\n" +
      "3. Если фит есть — объясни, что даст следующий шаг (онбординг-бот: демо платёжной страницы, " +
      "расчёт комиссий, тестовый платёж) и дай ссылку " + BOT_URL + ".\n\n" +
      "Начни сразу с вопросов, без длинного вступления."
    );
  }

  var TARGETS = {
    chatgpt: "https://chatgpt.com/?q=",
    claude:  "https://claude.ai/new?q="
  };

  function flash(el, text) {
    if (!el) return;
    var prev = el.getAttribute("data-label-original") || el.textContent.trim();
    if (!el.getAttribute("data-label-original")) el.setAttribute("data-label-original", prev);
    el.textContent = text;
    setTimeout(function () { el.textContent = el.getAttribute("data-label-original"); }, 1800);
  }

  function init() {
    document.querySelectorAll("[data-agent-handoff]").forEach(function (block) {
      if (block.dataset.bound === "true") return;
      block.dataset.bound = "true";

      var url = block.dataset.agentUrl ||
        (location.origin + location.pathname).replace(/\/index\.html?$/, "/");
      var segment = block.dataset.agentSegment || "default";
      var prompt = buildPrompt(url, segment);
      var encoded = encodeURIComponent(prompt);

      // Ссылки-кнопки на ChatGPT / Claude
      block.querySelectorAll("[data-agent-target]").forEach(function (link) {
        var key = link.dataset.agentTarget;
        if (TARGETS[key] && link instanceof HTMLAnchorElement) {
          link.href = TARGETS[key] + encoded;
        }
      });

      // Кнопка «скопировать промпт» — для YandexGPT / DeepSeek / любого другого чата
      block.querySelectorAll("[data-agent-copy]").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          if (e && e.preventDefault) e.preventDefault();
          var label = btn.querySelector("[data-agent-copy-label]") || btn;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(prompt).then(
              function () { flash(label, "Скопировано ✓"); },
              function () { flash(label, "Не удалось"); }
            );
          } else {
            var ta = document.createElement("textarea");
            ta.value = prompt; document.body.appendChild(ta); ta.select();
            try { document.execCommand("copy"); flash(label, "Скопировано ✓"); }
            catch (e) { flash(label, "Не удалось"); }
            document.body.removeChild(ta);
          }
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
