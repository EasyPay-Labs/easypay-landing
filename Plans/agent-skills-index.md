---
slug: agent-skills-index
status: planning
created: 2026-05-12
tasks: [agent-skills-index]
stack: frontend
iteration_policy: pragmatic
codex_session_id: 019e1cfb-5074-7da3-acee-184fcf6faff3
codex_rounds:
  - {round: 1, type: pre-impl, date: 2026-05-12, findings: {P1: 0, P2: 0, P3: 0}, verdict: ship}
plan_size_at_round_1: 14816
---

# Agent Skills Discovery Index на easypay.thenextgen.store

## Контекст

Анализатор `isitagentready.com` после публикации MCP Server Card (commit `e3cec53`) подсветил следующий пункт: `checks.discovery.agentSkills == "fail"`. Спецификация — [Agent Skills Discovery RFC v0.2.0](https://github.com/cloudflare/agent-skills-discovery-rfc), требует публикации индекса по `/.well-known/agent-skills/index.json`.

У EasyPay уже есть публичный AI Skill в `github.com/EasyPay-Labs/easypay-skill` (v0.3.0). Этот skill — естественный кандидат для публикации в индексе: он описывает 17 MCP-тулов и JTBD-флоу EasyPay для агентов, поднимаемых партнёрами.

Заказчик — Andrey. Срочности нет; это второй пункт agent-readiness scan после уже закрытого MCP Server Card.

## Объём

- **В работе:**
  - Клонировать `EasyPay-Labs/easypay-skill` в `C:/projects/easypay-skill` (HTTPS), чтобы был локальный source-of-truth рядом с другими проектами.
  - В клонированном репо создать `DEPLOY.md` с разделом «При обновлении SKILL.md → синхронизировать зеркало на лендинге». Commit локально; push в `EasyPay-Labs/easypay-skill` — отдельный gate (другой репо).
  - В `easypay-landing`:
    - Создать `.well-known/agent-skills/easypay/SKILL.md` — зеркало текущего SKILL.md из upstream.
    - Создать `.well-known/agent-skills/index.json` по схеме RFC v0.2.0 с одной записью `easypay` (`type: skill-md`, digest = sha256 от зеркала).
    - Создать `scripts/sync_skill.py` — Python-скрипт: fetch `https://raw.githubusercontent.com/EasyPay-Labs/easypay-skill/main/SKILL.md`, нормализация EOL в LF, запись зеркала, пересчёт sha256, обновление `digest` в `index.json`. Запускается вручную (Андреем или Антоном) после апдейта upstream.
    - Создать `.gitattributes` с `.well-known/agent-skills/** text eol=lf`, чтобы Windows-git не конвертил LF→CRLF и digest не разъезжался с тем, что Pages отдаёт.
    - Обновить `DEPLOY.md` — раздел Agent readiness + чеклист.
    - Обновить `sitemap.xml` — добавить URL `index.json` (SKILL.md в sitemap **не добавляем** — это контент-артефакт, не публичная страница).
  - В `C:/Users/Berk/headquarters/Projects/easypay.md` — актуализировать строку «Репозитории», добавить `easypay-landing` и `easypay-skill` (с зеркалом на лендинге и pointer'ом на sync-скрипт). Commit в headquarters-репо — отдельный gate.

- **Не в работе:**
  - GitHub Action для авто-sync upstream→landing. Сейчас вручную; автоматизация — отдельный follow-up если станет больно.
  - Архивы (`type: archive`) — у нас один SKILL.md, без бандлов.
  - Дополнительные скиллы в индексе (например, customer-guide). У EasyPay один публичный skill; новых не появилось.
  - Изменения внутри SKILL.md (контент) — мы зеркалим как есть.
  - Очистка устаревшей строки `~/easypay` в headquarters easypay.md — пути нет локально, но это не моя задача.

## Контракты

### `/.well-known/agent-skills/index.json` (новый)

Схема: `https://schemas.agentskills.io/discovery/0.2.0/schema.json`.

```json
{
  "$schema": "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
  "skills": [
    {
      "name": "easypay",
      "type": "skill-md",
      "description": "EasyPay payments — create products, payment links, invoices and request payouts via natural language. Use when the user mentions payment processing, Stripe, Mercury, crypto invoices, T-Bank, СБП, balance, payout, EasyPay, или просит «принять оплату», «создать платёжку», «выставить инвойс», «вывести деньги».",
      "url": "/.well-known/agent-skills/easypay/SKILL.md",
      "digest": "sha256:<computed by sync_skill.py>"
    }
  ]
}
```

- `name`: `easypay` — соответствует требованию RFC (lowercase + hyphens, 1-64 chars).
- `type`: `skill-md` — один SKILL.md, не архив.
- `description`: ровно из frontmatter SKILL.md upstream (соответствие single source of truth). Длина в пределах 1024 chars.
- `url`: path-absolute. По RFC v0.2.0 RFC 3986 §5 — резолвится относительно URL индекса. Path-absolute надёжнее относительного — пройдёт любой парсер.
- `digest`: `sha256:` + 64 lowercase hex. Считается от raw bytes файла, который GitHub Pages реально отдаёт.

### `/.well-known/agent-skills/easypay/SKILL.md` (новый, зеркало)

Полный текст текущего `EasyPay-Labs/easypay-skill@main:SKILL.md`. LF, UTF-8 без BOM. Под управлением `.gitattributes`.

### `.gitattributes` (новый)

```
.well-known/agent-skills/** text eol=lf
```

Один pattern — этого достаточно. Не трогаем остальные файлы репо (там уже свои конвенции). Если git вдруг применил CRLF к существующим файлам — это не наша проблема в этом скоупе, нас интересует только новая папка.

### `scripts/sync_skill.py` (новый)

Контракт:
- Аргумент: опциональный `--source-url` (default `https://raw.githubusercontent.com/EasyPay-Labs/easypay-skill/main/SKILL.md`).
- Делает:
  1. GET `--source-url` через `urllib.request`. На non-200 — exit 1 с понятным сообщением.
  2. Нормализует EOL: `body.replace(b"\r\n", b"\n").replace(b"\r", b"\n")`. UTF-8 без BOM (strip leading `\xef\xbb\xbf`).
  3. Перезаписывает `.well-known/agent-skills/easypay/SKILL.md` нормализованными байтами (binary write, чтобы Python не подменил EOL обратно).
  4. Считает `sha256` от тех же байт. Префиксует `sha256:`.
  5. Открывает `.well-known/agent-skills/index.json`, обновляет `skills[0].digest`, перезаписывает (UTF-8, indent=2, `ensure_ascii=False`, trailing newline).
  6. Печатает diff-summary: новый digest, размер файла, изменилось / не изменилось.
- Идемпотентность: повторный запуск без изменений в upstream → `index.json` не меняется (тот же digest).
- Не делает: commit / push, проверку схемы JSON (это в линтере отдельным шагом).

### `DEPLOY.md` в `C:/projects/easypay-skill/` (новый, в другом репо)

Создаём новый файл — у `EasyPay-Labs/easypay-skill` сейчас нет DEPLOY.md. Содержание (черновик):

```markdown
# Deploy / sync notes

## Где живёт SKILL.md

- **Source of truth:** этот репозиторий, `SKILL.md` в корне. Все правки делаются здесь.
- **Зеркало для агент-discovery:** `/.well-known/agent-skills/easypay/SKILL.md` на `https://easypay.thenextgen.store` (репозиторий `vanger-cat/easypay-landing`).

## При обновлении SKILL.md

1. Закоммитить и запушить изменения в `EasyPay-Labs/easypay-skill@main` (этот репо).
2. Обновить зеркало на лендинге:
   - Клонировать / pull `vanger-cat/easypay-landing`.
   - Запустить `python scripts/sync_skill.py` — скрипт скачает свежий SKILL.md из main этого репо, перезапишет зеркало и пересчитает sha256 digest в `index.json`.
   - Закоммитить изменения в `easypay-landing` (файлы: `.well-known/agent-skills/easypay/SKILL.md` и `.well-known/agent-skills/index.json`).
   - Запушить — GitHub Pages задеплоит за ~30 сек.
3. Проверить, что `https://easypay.thenextgen.store/.well-known/agent-skills/index.json` отдаёт обновлённый `digest` и `https://easypay.thenextgen.store/.well-known/agent-skills/easypay/SKILL.md` — обновлённый текст.

## Версионирование

Версия в frontmatter `SKILL.md` (`version: x.y.z`) — semver. Бампать при изменениях контракта тулов или существенных правках в JTBD-флоу. Patch-бамп — для фактических правок текста / опечаток.
```

### `Projects/easypay.md` в headquarters (правка)

Раздел «Репозитории» расширяется (см. секцию Объём).

## Архитектура

n/a — фронтенд-статика + utility-скрипт. Никаких сервисов, БД, идемпотентности на уровне рантайма (только идемпотентность скрипта sync — описана выше).

## Тестирование

### Автотесты
- Для `sync_skill.py` — n/a в этом раунде (скрипт ~40 строк, ручная проверка). Если решим автоматизировать через GitHub Action — добавим тест на нормализацию EOL и digest format в follow-up.

### Линтер
- `python -m json.tool < .well-known/agent-skills/index.json` — валидный JSON.
- Проверка обязательных полей (вручную или однострочником): `$schema`, `skills[].name`, `skills[].type`, `skills[].description`, `skills[].url`, `skills[].digest`. `digest` matches `^sha256:[0-9a-f]{64}$`.

### Изоляция бизнес-логики
n/a — нет логики.

### Мок-режим интерфейсов
n/a — нет UI.

### Ручное тестирование
1. Запустить `python scripts/sync_skill.py` локально → проверить, что:
   - `.well-known/agent-skills/easypay/SKILL.md` создан и содержит upstream-контент.
   - `index.json` содержит правильный `digest`.
   - Повторный запуск даёт identical файлы (idempotent).
2. `python -m json.tool` на `index.json` — валиден.
3. Локально `sha256sum .well-known/agent-skills/easypay/SKILL.md` (через `python -c "import hashlib, pathlib; print(hashlib.sha256(pathlib.Path('.well-known/agent-skills/easypay/SKILL.md').read_bytes()).hexdigest())"`) → совпадает с digest в index.json (без префикса `sha256:`).
4. После push:
   - `curl -fsS https://easypay.thenextgen.store/.well-known/agent-skills/index.json | python -m json.tool` → 200, валидный JSON.
   - `curl -fsS -o /tmp/skill.md https://easypay.thenextgen.store/.well-known/agent-skills/easypay/SKILL.md && sha256sum /tmp/skill.md` → совпадает с digest в index.json (без префикса).
   - `POST https://isitagentready.com/api/scan` → `checks.discovery.agentSkills.status == "pass"`.

### Playwright
n/a — нет UI.

## Аналитика
n/a — статический index + статический SKILL.md, не пользовательский флоу. Аналитика обращений агентов к этим URL требует edge-слоя (известное ограничение GitHub Pages, описано в `DEPLOY.md`).

## Логирование ошибок
n/a — нет рантайма. Failure modes:
- `sync_skill.py` падает на fetch → exit code 1, ручной retry. Не молча.
- GitHub Pages 404 на новый путь → `.nojekyll` уже в репо (из прошлой задачи), не должно случиться. Если случится — повторить проверку и грохнуть кэш через cache-bust query.
- Расхождение digest и реального ответа Pages → митигировано `.gitattributes` с `eol=lf`. Если всё-таки разъедется — на проверке после deploy будет видно.

## Verification Criteria

- [ ] `C:/projects/easypay-skill` существует как git-репо, ремоут `origin` ведёт на `https://github.com/EasyPay-Labs/easypay-skill.git`, ветка `main`, чистая (`git status` clean).
- [ ] В `C:/projects/easypay-skill/DEPLOY.md` создан раздел про sync с зеркалом на лендинге, файл коммитнут локально (push в org — отдельный gate, не часть критериев этой задачи).
- [ ] `C:/projects/easypay-landing/.well-known/agent-skills/index.json` существует, валидный JSON, содержит обязательные SEP-RFC поля.
- [ ] `C:/projects/easypay-landing/.well-known/agent-skills/easypay/SKILL.md` содержит upstream-контент, LF, UTF-8 без BOM.
- [ ] sha256 файла = digest в index.json (без префикса `sha256:`).
- [ ] `.gitattributes` содержит правило `eol=lf` для `.well-known/agent-skills/**`, git diff не показывает CRLF в этих файлах.
- [ ] `scripts/sync_skill.py` запускается, идемпотентен.
- [ ] `https://easypay.thenextgen.store/.well-known/agent-skills/index.json` → HTTP 200, `application/json`.
- [ ] `https://easypay.thenextgen.store/.well-known/agent-skills/easypay/SKILL.md` → HTTP 200, content-length и sha256 match локальной копии.
- [ ] `isitagentready` scan: `checks.discovery.agentSkills.status == "pass"`.
- [ ] `checks.discovery.mcpServerCard.status == "pass"` (предыдущая задача не сломалась).
- [ ] Существующие чеклисты `DEPLOY.md` (hero, robots, sitemap, index.md, mcp server-card) всё ещё зелёные.
- [ ] `headquarters/Projects/easypay.md` обновлён, локально коммитнут (push — отдельный gate).

## Документация

- `DEPLOY.md` в `easypay-landing`:
  - В раздел «Agent readiness» добавить упоминание `index.json` как закрытого пункта анализатора и pointer на `scripts/sync_skill.py` для обновления.
  - В чеклист «Проверка после деплоя» добавить 2 пункта: `index.json` 200/JSON и `agentSkills.status == "pass"` в скане.
- `DEPLOY.md` в `easypay-skill` (новый файл, см. Контракты).
- `headquarters/Projects/easypay.md` — список репозиториев актуализирован.
- `CLAUDE.md` / `KNOWLEDGE.md` в landing — n/a (проект без них).

## Порядок реализации

1. `git clone https://github.com/EasyPay-Labs/easypay-skill.git C:/projects/easypay-skill`.
2. Создать `C:/projects/easypay-skill/DEPLOY.md` (шаблон в Контрактах). Локальный commit. **Push в EasyPay-Labs/easypay-skill — отдельный gate, спрошу.**
3. В `easypay-landing`:
   a. Создать `.gitattributes` с правилом для `.well-known/agent-skills/**`.
   b. Создать пустую папку `.well-known/agent-skills/easypay/` (gitkeep не нужен — файл сразу появится).
   c. Создать `scripts/sync_skill.py` (по контракту).
   d. Запустить `python scripts/sync_skill.py` → создаст `SKILL.md` и обновит `index.json` (которого ещё нет — скрипт должен это уметь: если нет, создать с одной записью; для упрощения — заранее создать заглушку с `"digest": "sha256:0"` и дать скрипту перезаписать).
   e. Альтернативно (проще): сначала вручную создать `index.json` с placeholder digest, потом `sync_skill.py` перезапишет.
   f. Обновить `sitemap.xml` — добавить URL `index.json`.
   g. Обновить `DEPLOY.md` лендинга.
   h. Локальные проверки: JSON валиден, digest match, файлы LF.
4. Commit в `easypay-landing` одной транзакцией (по-русски), все новые файлы + правки.
5. Обновить `C:/Users/Berk/headquarters/Projects/easypay.md`. Локальный commit. **Push в headquarters — отдельный gate, спрошу.**
6. **Push `easypay-landing` — отдельный gate, спрошу.**
7. После push лендинга — Verification Criteria + isitagentready scan.

## Риски и допущения

- **EOL drift Windows ↔ GitHub Pages**: основной риск digest mismatch. Митигация — `.gitattributes` `eol=lf` + binary write в скрипте + проверка `git diff` перед commit'ом. Если после deploy digest реально не сошёлся — пересчитать на основе того, что Pages отдаёт по факту, обновить index.json (rare-edge fallback).
- **Кириллица в SKILL.md**: символы UTF-8 multi-byte, при нормализации EOL мы работаем на байтах — корректно. Запись `wb` в Python не трогает байты.
- **Изменение upstream без sync**: SKILL.md в upstream меняется без вызова `sync_skill.py` → зеркало протухнет. Митигация — DEPLOY.md в обоих репо явно описывает процедуру. Антону тоже видно (он работает с обоими репо).
- **GitHub Pages `Content-Type` для `.md`**: может быть `text/markdown` или `text/plain`. На digest не влияет (digest по байтам), на валидатор RFC v0.2.0 — тоже не должен влиять (RFC не предписывает MIME). Если isitagentready жёстко требует `text/markdown` — это вне нашего контроля на GitHub Pages, фиксаем через edge-слой (out of scope).
- **Push в EasyPay-Labs org**: предполагаю, что у Andrey есть права push'а в `EasyPay-Labs/easypay-skill@main`. Если нет — push не пройдёт, и DEPLOY.md останется только локально; задача всё равно закроется на лендинге (digest независим). Это будет видно при попытке push.
- **`description` в index.json**: SKILL.md содержит большой блок русского + кириллицы. JSON в UTF-8 поддерживает — `ensure_ascii=False` при сериализации.
- **Out of scope ratchet**: не добавлять `mcp.json`, `server-cards.json` (множественное), `agent-card.json`, `apiCatalog`, `oauthDiscovery` — это другие fail-пункты в скане, отдельные задачи.

## Codex review handoff

### Уже отработанные блокеры

### Round 1 (pre-impl) — 2026-05-12

Findings: P1×0, P2×0, P3×0. Verdict: **ship**.

Codex session: `019e1cfb-5074-7da3-acee-184fcf6faff3`. Полный ответ — см. чат / `~/.codex/sessions/`.
