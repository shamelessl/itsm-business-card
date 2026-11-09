# Цифровая визитка Степана Кузьмина

Backend тестового задания: TypeScript, Node.js, NestJS, Apollo GraphQL, Prisma, PostgreSQL, Docker Compose. API предоставляет публичную карточку с описанием, ссылками, навыками, проектами и опытом. Изменяющих данные GraphQL операций нет.

## Запуск через Docker

Нужны Docker Engine и Docker Compose v2. В папке проекта:

```powershell
Copy-Item .env.example .env
docker compose up --build -d --wait
```

Открой [Apollo Sandbox](http://localhost:3000/graphql). Проверка приложения и соединения с БД: [GET /health](http://localhost:3000/health).

Compose ждёт готовности PostgreSQL. Процесс API выполняет `prisma migrate deploy`, затем идемпотентный seed, затем запускает HTTP-сервер. Если миграция или seed завершаются ошибкой, сервер не стартует. Повторный запуск не дублирует записи и не перезаписывает существующее содержимое. Seed создаёт только отсутствующие записи по стабильным ID, сохраняет ручные изменения и добавленные записи. Удалённая начальная запись будет создана снова. Изменение текста в `seed.cjs` не обновляет уже заполненную БД: правки существующей карточки нужно вносить отдельно, без сброса базы или тома.

```powershell
docker compose logs api
docker compose down
```

`down` сохраняет именованный том БД. Пароль в примере предназначен только для локального демо. Для другого пароля используй URL-безопасные символы либо отдельно закодируй пароль в DATABASE_URL. PostgreSQL не публикует порт на хост; HTTP доступен только с локального компьютера.

## Запуск без Docker

Нужны Node.js 22+ и работающая PostgreSQL 17 с базой в UTF-8.

```powershell
Copy-Item .env.example .env
# Укажи в .env DATABASE_URL своей локальной БД.
npm ci
npm run build
npm start
```

`npm start` читает `.env`, выполняет те же миграцию и seed. Для проверки схемы и TypeScript: `npm run check`. Prisma читает DATABASE_URL из `.env`. Node 24 используется в Dockerfile и при локальной проверке.

## Пример запроса

```graphql
query BusinessCard {
  profile {
    name
    description
    links { label url }
    skills { name }
    experience { company position period achievements }
    projects { name description link }
  }
}
```

Если карточки нет, `profile` возвращает `null`. Пустые связанные списки возвращаются как `[]`. Профиль содержит ссылку на портфолио. В `projects.link` для трёх начальных проектов указаны их публичные карточки с описанием реализации. Это материалы портфолио; открытых репозиториев и демо этих проектов в комплекте нет. Для дополнительных проектов без публичного материала поле допускает `null`. Опыт обозначен как самостоятельная проектная работа с июня 2026 по настоящее время. В seed нет закрытых материалов или учётных данных.

## Архитектура

- `src/card/card.models.ts`: публичные GraphQL-типы, code-first схема.
- `card.resolver.ts`: GraphQL точка входа.
- `card.service.ts`: чтение карточки и сортировка связанных списков.
- `src/database/prisma.service.ts`: жизненный цикл подключения к PostgreSQL.
- `prisma/schema.prisma` и `prisma/migrations`: реляционная модель и версионируемая миграция.
- `prisma/seed.cjs`: начальные данные в одной транзакции; upsert по стабильным ID без перезаписи существующих записей.
- `scripts/start.cjs`: последовательный запуск миграции, seed и API.

Profile связан с ProfessionalLink, Skill, Experience и Project внешними ключами; есть индексы по владельцу и порядку. Публичные типы не раскрывают технические поля сортировки и FK. `relationLoadStrategy: 'join'` загружает карточку и все четыре списка одним SQL-запросом PostgreSQL; нет запроса на каждый элемент списка. Для единственной небольшой карточки выбран eager loading вместо набора field-resolver/DataLoader. Если появятся каталоги профилей и большие списки, понадобятся пагинация и выборочная загрузка.

API не принимает идентификаторы/фильтры от пользователя. Запросы выполняет Prisma; проверка health использует tagged SQL template. Включены CSRF protection Apollo, ограничение JSON 64 КБ, ограничение развёрнутых selections до 1000, запрет batch-запросов и скрытие stack traces. Introspection и Sandbox включены по заданию. В контейнере API работает от пользователя node. Это локальное демо; внешнее размещение требует отдельной настройки HTTPS, сетевого доступа и rate limiting.

Sandbox загружает интерфейс Apollo из сети. HTTP landing page и introspection проверяются автоматически. 05.11.2026 интерфейс дополнительно проверен во встроенном браузере: загрузилась схема, операция BusinessCard вернула HTTP 200 и данные карточки.

## Проверки

```powershell
npm run build
npm run check
$env:TEST_DATABASE_URL = 'postgresql://user:password@127.0.0.1:5432/test_database'
npm run test:e2e
```

E2E создаёт отдельную схему `card_e2e_<timestamp>` в указанной тестовой БД, не использует схему приложения и не удаляет её. Нужны права на создание схемы. Проверяются чистый старт, миграция и seed, полная карточка через HTTP, introspection для Sandbox, landing page, неверное поле, отсутствие mutations, лимит размера, лимит сложности и один SQL-запрос для вложенных связей. Повторный запуск проверяется после изменения профиля, ссылки, навыка, периода и достижений опыта, описания и URL проекта, а также добавления пользовательского проекта: все значения и записи должны сохраниться без дублей.

04–05.11.2026 прошли сборка, проверка схемы и TypeScript, а также E2E с PostgreSQL: чистый старт, полный GraphQL-запрос, ограничения запросов, загрузка связанных данных одним SQL и сохранение изменений при повторном старте. Интерактивный Apollo Sandbox проверен в браузере. Docker не найден на машине проверки, поэтому сборка образа и чистый старт Compose остаются неподтверждёнными.

## Git и передача

Файлы зависимостей закреплены `package-lock.json`. `.env`, node_modules, результаты сборки и тестовая БД исключены из Git и Docker context. Публичные URL Git и демо проверяются после размещения.

Документация: [NestJS GraphQL](https://docs.nestjs.com/graphql/quick-start), [Apollo Sandbox](https://www.apollographql.com/docs/graphos/platform/sandbox), [Prisma 6 seed](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/seeding).
