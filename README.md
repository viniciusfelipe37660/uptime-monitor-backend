# Uptime Monitor — Backend

API em NestJS para um serviço de monitoramento de uptime: cadastro de monitores HTTP, checagens agendadas, histórico de incidentes e página pública de status.

## Stack

- NestJS 12 + TypeScript
- PostgreSQL via Prisma ORM
- Autenticação JWT (cookie httpOnly)
- Vitest para testes

## Rodando localmente

```bash
cp .env.example .env   # preencha DATABASE_URL, JWT_SECRET, CORS_ORIGIN
npm install
npx prisma migrate dev
npm run start:dev
```

## Arquitetura

- `auth/` — registro/login (argon2id para hashing), emissão de JWT em cookie httpOnly
- `projects/` — projetos do usuário + página pública `/status/:slug`
- `monitors/` — CRUD de monitores HTTP, escopado por projeto/usuário
- `checks/` — worker (`@nestjs/schedule`, cron a cada minuto) que executa as checagens e gerencia incidentes
- `prisma/` — schema do banco (`User`, `Project`, `Monitor`, `Check`, `Incident`)

## Segurança

- **Hashing de senha**: argon2id (não bcrypt/sha), parâmetros padrão da lib (já calibrados contra GPU cracking)
- **Timing-safe login**: ao logar com e-mail inexistente, roda `argon2.verify` contra um hash dummy para não vazar, por tempo de resposta, se o e-mail existe
- **JWT em cookie httpOnly + Secure + SameSite**, não em `localStorage` (mitiga roubo de token via XSS)
- **Rate limiting**: `@nestjs/throttler` global (100 req/min) + limite mais restrito (5/min) em `/auth/login` e `/auth/register` contra força bruta
- **Validação de entrada**: `class-validator` com `whitelist` + `forbidNonWhitelisted` em todos os DTOs (rejeita campos não esperados)
- **Proteção contra SSRF** (`common/utils/url-safety.ts`): como o worker faz requisições HTTP para URLs cadastradas pelo usuário, toda URL é validada antes de cada checagem — bloqueia protocolos fora de http/https, localhost, IPs loopback/privados/link-local (incluindo `169.254.169.254`, usado por metadados de cloud), e revalida redirecionamentos (máx. 2 hops) antes de segui-los
- **Helmet** para headers HTTP seguros (CSP básico, HSTS, etc.)
- **CORS restrito** a uma origin explícita (sem wildcard), com `credentials: true`
- **Autorização por recurso**: todo acesso a projeto/monitor valida o `userId` dono do registro — nunca apenas a existência do ID
- **Proteção CSRF (double-submit cookie)**: como o cookie de sessão precisa de `SameSite=None` em produção (frontend e backend em domínios diferentes), toda requisição que muda estado (POST/PUT/PATCH/DELETE) exige um header `X-CSRF-Token` igual ao cookie `csrf_token` (não-httpOnly, legível pelo frontend). O frontend obtém esse cookie com qualquer requisição GET (ex: `/auth/me`) antes de enviar a primeira mutação
- **Segredos fora do código**: `.env` no `.gitignore`, validado via schema (Zod) no boot — a aplicação não sobe se faltar `JWT_SECRET`, `DATABASE_URL`, etc.
- **CI**: lint + type-check + testes + `npm audit --audit-level=high` em todo PR; Dependabot semanal para dependências

## Endpoints principais

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/register` | — | Cria usuário |
| POST | `/auth/login` | — | Login |
| POST | `/auth/logout` | — | Remove cookie |
| GET | `/auth/me` | JWT | Usuário atual |
| POST | `/projects` | JWT | Cria projeto |
| GET | `/projects/:id` | JWT | Detalhe do projeto |
| POST | `/projects/:projectId/monitors` | JWT | Cria monitor |
| GET | `/monitors/:id/checks` | JWT | Histórico de checagens |
| GET | `/monitors/:id/incidents` | JWT | Histórico de incidentes |
| GET | `/status/:slug` | — | Página pública de status |
