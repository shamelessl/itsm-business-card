const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const profileId = 'stepan';
const order = (items) => items.map((item, sortOrder) => ({ ...item, sortOrder }));
const card = {
  id: profileId,
  name: 'Степан Кузьмин',
  description: 'Разрабатываю приложения, API и инструменты автоматизации на Python и TypeScript. Работаю с SQL, фоновыми задачами, интеграциями и агентными сценариями. Москва, удалённая работа.',
  links: order([
    { id: 'telegram', label: 'Telegram для связи', url: 'https://t.me/ocniligo' },
    { id: 'portfolio', label: 'Портфолио', url: 'https://drive.google.com/file/d/190evRut3d3Qg3h5WDPJzknQTvE7x60M-/view' }
  ]),
  skills: order(['Python', 'TypeScript', 'Node.js', 'SQL / PostgreSQL / SQLite', 'HTTP API', 'Telegram / Mini Apps', 'Linux / Docker', 'AI agents'].map((name, i) => ({ id: `skill-${i}`, name }))),
  experience: order([{
    id: 'independent-projects', company: 'Самостоятельные проекты',
    position: 'Разработка приложений и автоматизации',
    period: 'Проектная работа с июня 2026 по настоящее время',
    achievements: [
      'Разработал backend Telegram Mini App с группами, ролями, заданиями и очередью на сдачу.',
      'Реализовал учёт складских операций с проверкой версии данных, защитой от повторов и восстановлением состояния.',
      'Работал с Linux-сервисами, конфигурациями удалённых узлов, мониторингом и резервными копиями.'
    ]
  }]),
  projects: order([
    { id: 'studygram', name: 'Studygram', description: 'Telegram Mini App: учебные группы, расписание, задания, роли и уведомления.', link: 'https://drive.google.com/file/d/1w-kWjiw6uWxV2lK1lY4_miN8BDBYjcUc/view' },
    { id: 'induora', name: 'INDUORA', description: 'Учёт товаров и складских операций: согласованность данных, транзакции и защита от повторов.', link: 'https://drive.google.com/file/d/1bvj9MdTU82DTQqEGm5gC9vubPCP_isVZ/view' },
    { id: 'connections', name: 'Сервис управления подключениями', description: 'Linux, Python, SQLite и SSH: управление узлами, конфигурации, мониторинг и резервные копии.', link: 'https://drive.google.com/file/d/18GdvHB38NCyCL2UX4XQmKR7ljVIP_ecs/view' }
  ])
};

async function seed() {
  // Stable IDs make a restart safe: existing editable content is not overwritten.
  const { links, skills, experience, projects, ...profile } = card;
  await prisma.$transaction(async (tx) => {
    await tx.profile.upsert({ where: { id: profileId }, update: {}, create: profile });
    for (const [model, items] of Object.entries({ professionalLink: links, skill: skills, experience, project: projects })) {
      for (const item of items) {
        await tx[model].upsert({ where: { id: item.id }, update: {}, create: { ...item, profileId } });
      }
    }
  });
  console.log('Business card seed is ready.');
}
seed().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
