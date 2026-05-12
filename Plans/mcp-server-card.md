---
slug: mcp-server-card
status: done
created: 2026-05-12
tasks: [mcp-server-card]
stack: frontend
iteration_policy: pragmatic
codex_session_id: 019e1be4-b374-7950-b238-2aa8b53a68fb
codex_rounds:
  - {round: 1, type: pre-impl, date: 2026-05-12, findings: {P1: 0, P2: 0, P3: 0}, verdict: ship}
plan_size_at_round_1: 7919
---

# MCP Server Card на easypay.thenextgen.store

## Контекст

Анализатор `isitagentready.com` диагностирует на нашем GitHub Pages лендинге проблему «MCP Server Card not found». По SEP-2127 (`https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127`) сервер должен публиковать карточку по адресу `/.well-known/mcp/server-card.json` для агент-discovery до коннекта.

У нас уже есть реальный MCP-сервер `easypay` на `https://mcp.appload.tech/sse` (SSE transport, auth через header `X-Partner-Api-Key`), скилл в `github.com/EasyPay-Labs/easypay-skill` (v0.3.0, 17 тулов). Лендинг `easypay.thenextgen.store` — точка входа для агентов и людей, поэтому карточку публикуем на нём.

Заказчик задачи — Andrey (owner проекта). Срочности нет, но это блокер для прохождения agent-readiness scan.

## Объём

- **В работе:**
  - Создать `.well-known/mcp/server-card.json` с минимально-достаточными по SEP-2127 полями.
  - Создать `.nojekyll` в корне (иначе GitHub Pages-Jekyll не отдаст папку, начинающуюся с точки).
  - Обновить `robots.txt` (`Allow: /.well-known/`).
  - Обновить `sitemap.xml` (добавить URL карточки).
  - Обновить `DEPLOY.md` — раздел Agent readiness + чеклист.

- **Не в работе:**
  - Подъём собственного MCP-сервера — он уже существует на `mcp.appload.tech`.
  - Edge-слой перед GitHub Pages (Cloudflare Worker для `Link` headers / content negotiation) — отдельная задача из существующего DEPLOY.md.
  - Дублирование карточки на `mcp.appload.tech` — она уже может там быть, не наша зона ответственности.
  - `server.json` для local-package discovery — у EasyPay только remote MCP.

## Контракты

- `/.well-known/mcp/server-card.json` — публичный статический файл, схема по `https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json` (SEP-2127).

Финальный JSON:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
  "name": "tech.appload.mcp/easypay",
  "version": "0.3.0",
  "title": "EasyPay",
  "description": "EasyPay payments — create products, payment links, invoices and request payouts via natural language. Stripe, Mercury, crypto (USDT/USDC), T-Bank; USD/EUR/RUB/CRYPTO balances and payouts.",
  "websiteUrl": "https://easypay.thenextgen.store",
  "repository": {
    "url": "https://github.com/EasyPay-Labs/easypay-skill",
    "source": "github"
  },
  "remotes": [
    {
      "type": "sse",
      "url": "https://mcp.appload.tech/sse",
      "supportedProtocolVersions": ["2025-06-18"],
      "headers": [
        {
          "name": "X-Partner-Api-Key",
          "description": "EasyPay partner API key. Obtain via @easypay_onboarding_bot in Telegram.",
          "isRequired": true,
          "isSecret": true
        }
      ]
    }
  ]
}
```

Решения по полям (подтверждено владельцем):
- `name`: `tech.appload.mcp/easypay` — реверс-DNS по хосту реального сервера, совпадает с `Implementation.name` в `initialize`.
- `version`: `0.3.0` — синхронно со скиллом `EasyPay-Labs/easypay-skill`.
- `supportedProtocolVersions`: `["2025-06-18"]` (последний стабильный).

## Архитектура

n/a — фронтенд-статика без логики. Никаких функций, идемпотентности, БД.

## Тестирование

### Автотесты
n/a — нет кода, только статические файлы. Валидность JSON проверяется ручным curl + утилитой `python -m json.tool` в чеклисте.

### Линтер
- `python -m json.tool < .well-known/mcp/server-card.json` — JSON валиден.
- Опционально: `jsonschema` против `https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json` если схема публично доступна. Если нет — пропускаем (схема в Draft).

### Изоляция бизнес-логики
n/a — нет логики.

### Мок-режим интерфейсов
n/a — нет интерфейсов.

### Ручное тестирование
1. Локально открыть `.well-known/mcp/server-card.json` в браузере → файл показывается.
2. После push на `main` подождать ~30 сек GitHub Pages deploy.
3. `curl -fsS -o /dev/null -w "%{http_code} %{content_type}\n" https://easypay.thenextgen.store/.well-known/mcp/server-card.json` → `200 application/json`.
4. `curl -fsS https://easypay.thenextgen.store/.well-known/mcp/server-card.json | python -m json.tool` → валидный JSON.
5. `curl -X POST https://isitagentready.com/api/scan -H 'Content-Type: application/json' -d '{"url":"https://easypay.thenextgen.store"}'` → `checks.discovery.mcpServerCard.status == "pass"`.

### Playwright
n/a — нет UI.

## Аналитика
n/a — статический файл, не пользовательский флоу. Если в будущем понадобится знать, сколько агентов запрашивают карточку — это GitHub Pages access logs (которых нет; нужен edge-слой), не в этом скоупе.

## Логирование ошибок
n/a — нет рантайма. Единственная failure mode — 404 от GitHub Pages (если `.nojekyll` не сработал) или невалидный JSON. Обе ловятся ручным чеклистом выше.

## Verification Criteria

- [x] `https://easypay.thenextgen.store/.well-known/mcp/server-card.json` отдаёт HTTP 200 с `Content-Type: application/json` (или `application/json; charset=utf-8`).
- [x] Тело ответа — валидный JSON, парсится `python -m json.tool` без ошибок.
- [x] JSON содержит обязательные SEP-2127 поля: `$schema`, `name`, `version`, `description`. `name` — в формате `<reverse-dns>/<server>` с ровно одним слэшем.
- [x] `remotes[0].url` равен `https://mcp.appload.tech/sse`, `type` равен `sse`.
- [x] `https://easypay.thenextgen.store/robots.txt` остаётся `200 OK` и теперь содержит строку `Allow: /.well-known/`.
- [x] `https://easypay.thenextgen.store/sitemap.xml` остаётся `200 OK` и содержит URL карточки в новом `<url>` блоке.
- [x] `POST https://isitagentready.com/api/scan` с `{"url":"https://easypay.thenextgen.store"}` возвращает `checks.discovery.mcpServerCard.status == "pass"`.
- [x] Существующие чеклисты из `DEPLOY.md` (hero, CTA, robots, sitemap, index.md) всё ещё зелёные после деплоя.

## Документация

- `DEPLOY.md` — в раздел «Проверка после деплоя» добавить 2 пункта (server-card.json и isitagentready scan). В раздел «Agent readiness» добавить упоминание server-card.json как закрытого пункта анализатора.
- `CLAUDE.md` — n/a, проект-лендинг не имеет CLAUDE.md.
- KNOWLEDGE.md — n/a, проект не использует knowledge base.
- README — без изменений (README репозитория из одной строки).

## Порядок реализации

1. Создать `Plans/mcp-server-card.md` (этот файл).
2. Создать `.nojekyll` в корне (пустой файл).
3. Создать `.well-known/mcp/server-card.json` с финальным JSON выше.
4. Обновить `robots.txt`: добавить `Allow: /.well-known/`.
5. Обновить `sitemap.xml`: добавить `<url><loc>https://easypay.thenextgen.store/.well-known/mcp/server-card.json</loc></url>`.
6. Обновить `DEPLOY.md`: чеклист + раздел Agent readiness.
7. Локально проверить JSON через `python -m json.tool`.
8. Commit (одной транзакцией, по-русски сообщение).
9. **Спросить пользователя про push** (push — отдельный gate).
10. После push — прогнать Verification Criteria.

## Риски и допущения

- **Jekyll**: GitHub Pages без `.nojekyll` игнорирует пути, начинающиеся с точки или подчёркивания. Поэтому `.nojekyll` критически обязателен. Альтернатива — `_config.yml` с `include: [".well-known"]`, но `.nojekyll` проще и не тащит за собой остальные Jekyll-эффекты.
- **Расхождение схем**: SKILL.md от isitagentready.com упоминает `serverInfo / transport / capabilities`, а сам SEP-2127 — `name / version / remotes`. Делаем по SEP-2127 как по authoritative источнику. Если валидатор isitagentready по факту требует другую форму — fallback: добавить дублирующие поля поверх, не ломая SEP-2127 структуру. Зафиксировано в post-fix плане, если случится.
- **`mcp.appload.tech` доступен внешним агентам**: предполагаем да (URL фигурирует в публичном README скилла). Если по факту сервер закрыт ACL'ом — карточка остаётся валидной, но клиент с правильным API key должен ходить. Проверка в Verification — только что лендинг отдаёт карточку, не что MCP-сервер достижим (за наши границы).
- **Подпись JSON / signature**: SEP-2127 не требует подписи карточки в этом раунде. Не делаем.

## Codex review handoff

### Уже отработанные блокеры

### Round 1 (pre-impl) — 2026-05-12

Findings: P1×0, P2×0, P3×0. Verdict: **ship**.

Codex session: `019e1be4-b374-7950-b238-2aa8b53a68fb`. Полный ответ — см. чат / `~/.codex/sessions/`.
