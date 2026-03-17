# FormFlow — Acompanhamento do Projeto

> **Atualizado em:** Março 2026  
> **Stack:** Spring Boot 3 + PostgreSQL 17 + MinIO | Angular 19 + PrimeNG 19 + Tailwind 3.4  
> **Linhas de código:** Backend ~5.450 Java | Frontend ~4.350 TypeScript | 10 migrations SQL

---
## Regras de tecnoligias
- Priorize componentes do primeng v19 ao invés de criar o que ja existe nele para uso
- Tailwind priorizar não gerar css puro, e usar as classes do tailwind
- Componentizar

## ✅ CONCLUÍDO

### Backend — API REST

| # | Feature | Arquivos | Status |
|---|---------|----------|--------|
| 1 | **Auth completo** (register, login, refresh, me, update profile/password) | AuthController, AuthService, JwtService, JwtAuthFilter, JwtProperties, SecurityConfig | ✅ |
| 2 | **CRUD Formulários** (criar, listar, detalhar, atualizar, arquivar) | FormController, FormService, FormRepository | ✅ |
| 3 | **Versionamento** (schema JSONB, listar versões, detalhar versão) | FormVersion, FormVersionRepository | ✅ |
| 4 | **Publicar formulário** (versão + extrai questions + valida condições) | FormService.publish(), SchemaConditionValidator | ✅ |
| 5 | **Duplicar formulário** (deep clone com novos UUIDs + atualiza referências) | FormService.duplicate(), FormController | ✅ |
| 6 | **Endpoint público** (GET schema para respondente sem auth) | PublicFormController, PublicFormResponse | ✅ |
| 7 | **Submissão de respostas** (payload + answers individuais tipadas) | ResponseController, ResponseService | ✅ |
| 8 | **Validação completa do payload** (required, tipo, formato, min/max, regex, options) | PayloadValidator, GlobalExceptionHandler | ✅ |
| 9 | **Lógica condicional** (validação no publish + avaliação no submit + cascata) | SchemaConditionValidator, ConditionEvaluator | ✅ |
| 10 | **Upload de arquivos** (presign MinIO, confirm, download, info) | FileController, StorageService, UploadValidator | ✅ |
| 11 | **Validação de upload** (MIME, tamanho, extensão, dupla extensão, path traversal) | UploadValidator, UploadProperties, FormUploadConfig | ✅ |
| 12 | **Cleanup de órfãos** (scheduled job remove PENDING > 24h do MinIO) | OrphanFileCleanupJob, CleanupProperties | ✅ |
| 13 | **Email notifications** (fila assíncrona, 3 tentativas, scheduled 30s) | EmailService, EmailNotification | ✅ |
| 14 | **Analytics** (summary, timeline por dia, stats por questão) | AnalyticsController, AnalyticsService | ✅ |
| 15 | **Export CSV** | ResponseController.exportCsv() | ✅ |
| 16 | **Exception Handler global** (erros estruturados com details[]) | GlobalExceptionHandler | ✅ |

### Backend — Banco de Dados (10 migrations)

| Migration | Tabela/Alteração |
|-----------|-----------------|
| V1 | `users` |
| V2 | `forms` (title, status, layout) |
| V3 | `form_versions` (schema JSONB) |
| V4 | `questions` (desnormalização do schema) |
| V5 | `responses` (payload JSONB) |
| V6 | `response_answers` (tipadas: text, number, date, options, files) |
| V7 | `uploaded_files` (MinIO tracking) |
| V8 | `email_notifications` (fila) |
| V9 | `forms` + visibility, slug, password_hash, max_responses, expires_at, messages |
| V10 | `form_upload_configs` + uploaded_files.question_id |

### Frontend — Componentes

| # | Feature | Arquivos | Status |
|---|---------|----------|--------|
| 1 | **Auth** (login, registro, JWT interceptor, refresh automático, guards) | login.component, register.component, auth.service, auth.store, auth.interceptor, auth.guard, guest.guard | ✅ |
| 2 | **Layout** (sidebar, topbar, main-layout com router-outlet) | main-layout.component, sidebar.component, topbar.component | ✅ |
| 3 | **Dashboard** (stats cards, formulários recentes, skeleton, empty state) | dashboard.component | ✅ |
| 4 | **Listagem de formulários** (busca, filtros status, cards, ações, paginação) | form-list.component, create-form-dialog.component | ✅ |
| 5 | **Form Builder** (3 painéis: toolbox + canvas drag&drop + properties) | form-builder.component, builder.store, builder.models, builder-canvas, builder-toolbox, builder-properties | ✅ |
| 6 | **Auto-save** (debounce 3s, Ctrl+S, beforeunload, save on destroy) | form-builder.component (integrado) | ✅ |
| 7 | **Preview interativo** (inputs reais, condições, validação, multi-step) | builder-preview-dialog.component | ✅ |
| 8 | **Formulário público** (rota /f/:formId, renderização + submit real) | form-renderer.component | ✅ *(entregue, aplicar)* |
| 9 | **Tela de Respostas** (tabela paginada, filtro por data, detalhe em dialog) | form-responses.component | ✅ |
| 10 | **Export CSV** (botão na tela de respostas, download direto) | form-responses.component, form-api.service | ✅ |

### Frontend — API Services

| Service | Métodos |
|---------|---------|
| `auth.service.ts` | login, register, refresh, getProfile, updateProfile, updatePassword, logout |
| `form-api.service.ts` | create, list, getById, update, archive, publish, listVersions, getVersion, duplicate, getPublicForm, submitResponse |
| `upload-api.service.ts` | presign, uploadDirect, confirm, getDownloadUrl, uploadFile (fluxo completo) |

### Frontend — Rotas ativas

| Rota | Auth | Componente |
|------|------|-----------|
| `/login` | Guest only | LoginComponent |
| `/register` | Guest only | RegisterComponent |
| `/f/:formId` | Nenhuma | FormRendererComponent *(aplicar)* |
| `/dashboard` | ✅ | DashboardComponent |
| `/forms` | ✅ | FormListComponent |
| `/forms/:id/edit` | ✅ | FormBuilderComponent |

---

## 🔲 PENDENTE — Frontend

### Prioridade Alta

| # | Feature | Descrição | Complexidade |
|---|---------|-----------|-------------|
| ~~F1~~ | ~~**Tela de Respostas**~~ | ~~Tabela paginada com respostas do formulário. Filtros por data. Detalhe individual expandido ou página separada.~~ | ✅ **Concluído** |
| ~~F2~~ | ~~**Export CSV**~~ | ~~Botão na tela de respostas que chama `GET /forms/{id}/responses/export/csv` e dispara download do arquivo.~~ | ✅ **Concluído** |
| ~~F3~~ | ~~**Analytics Dashboard**~~ | ~~Gráficos com PrimeNG Charts (Chart.js). Timeline (line), distribuição de choices (bar/pie), numeric stats (KPIs), top words (bar horizontal). Consume `GET /forms/{id}/analytics`.~~ | ✅ **Concluído** |

### Prioridade Média

| # | Feature | Descrição | Complexidade |
|---|---------|-----------|-------------|
| ~~F4~~ | ~~**Responsividade mobile**~~ | ~~Sidebar toggle (hamburger) em telas < 768px. Ajustes no builder para mobile.~~ | ✅ **Concluído** |
| ~~F5~~ | ~~**Tema escuro**~~ | ~~Toggle claro/escuro via CSS variables. PrimeNG suporta `darkModeSelector`.~~ | ~~Média~~ | ✅ **Concluído** |
| ~~F6~~ | ~~**Configurações do formulário**~~ | ~~Tela `/forms/:id/settings` para editar: visibilidade (público/privado/senha), slug, max_responses, expires_at, welcome/thank you messages.~~ | ✅ **Concluído** |
| F7 | **Perfil do usuário** | Tela `/settings/profile` para editar nome e senha. | Baixa |

### Prioridade Baixa

| # | Feature | Descrição | Complexidade |
|---|---------|-----------|-------------|
| F8 | **Notificações** | Badge no topbar com contagem. Dropdown com últimas respostas recebidas. | Média |
| F9 | **i18n** | pt-BR como padrão, preparar en-US com Angular i18n ou ngx-translate. | Média |
| F10 | **Atalhos de teclado** | Além do Ctrl+S já implementado: Del (remover questão), Ctrl+D (duplicar), Ctrl+Z (undo). | Média |
| F11 | **Undo/Redo no builder** | Stack de estados para desfazer/refazer ações no builder. | Alta |

---

## 🔲 PENDENTE — Backend

### Prioridade Média

| # | Feature | Descrição | Complexidade |
|---|---------|-----------|-------------|
| B1 | **Visibilidade efetiva** | O V9 criou os campos mas falta implementar a lógica: verificar expires_at, max_responses, visibility + password no `PublicFormController`. Endpoint `POST /public/forms/{id}/verify-password`. | Média |
| B2 | **Slug amigável** | Gerar slug único automático a partir do título. Endpoint `GET /public/forms/slug/{slug}` como alternativa ao UUID. | Baixa |
| B3 | **Questão Matriz** | Adicionar `matrix` ao CHECK constraint, extração/persistência de respostas de matriz no ResponseService. | Média |
| B4 | **Salvar rascunho do schema** | O `PUT /forms/{id}` recebe `schema` no body mas o campo não é persistido em `forms` (só em `form_versions` ao publicar). Opção: criar campo `draft_schema` na tabela `forms` ou salvar como versão não-publicada. | Média |

### Prioridade Baixa

| # | Feature | Descrição | Complexidade |
|---|---------|-----------|-------------|
| B5 | **Multi-tenancy** | Tabelas `tenants` + `tenant_members`, `tenant_id` em todas as tabelas, Hibernate Filter. | Alta |
| B6 | **Webhooks** | POST para URL configurável quando resposta é submetida. Tabela `webhooks` + job assíncrono. | Média |
| B7 | **Rate limiting** | Limitar submissões por IP/formulário para evitar spam. Spring Boot Bucket4j ou filtro customizado. | Média |
| B8 | **Swagger/OpenAPI** | Adicionar springdoc-openapi para documentação automática da API. | Baixa |
| B9 | **Testes** | Unit tests (services + validators) + integration tests (controllers + repositories). | Alta |
| B10 | **Docker Compose completo** | Adicionar container da API ao docker-compose (atualmente só tem PostgreSQL + MinIO). | Baixa |

---

## 📋 Contrato de Endpoints (referência rápida)

### Autenticação
```
POST   /auth/register          ← RegisterRequest → AuthResponse
POST   /auth/login             ← LoginRequest → AuthResponse  
POST   /auth/refresh           ← Header X-Refresh-Token → AuthResponse
GET    /auth/me                → UserResponse
PUT    /auth/me                ← UpdateProfileRequest → UserResponse
PUT    /auth/me/password       ← UpdatePasswordRequest → 204
```

### Formulários (autenticado)
```
POST   /forms                  ← CreateFormRequest → FormResponse
GET    /forms                  → Page<FormResponse>
GET    /forms/{id}             → FormResponse
PUT    /forms/{id}             ← UpdateFormRequest → FormResponse
DELETE /forms/{id}             → 204 (arquiva)
POST   /forms/{id}/publish     ← { schema } → PublishResponse
GET    /forms/{id}/versions    → FormVersionResponse[]
GET    /forms/{id}/versions/{v}→ FormVersionResponse
POST   /forms/{id}/duplicate   → FormResponse
```

### Respostas (autenticado exceto submit)
```
POST   /forms/{id}/responses          ← SubmitResponseRequest → ResponseDetailResponse  [público]
GET    /forms/{id}/responses          → Page<ResponseSummaryResponse>
GET    /forms/{id}/responses/{rid}    → ResponseDetailResponse
GET    /forms/{id}/responses/export/csv → CSV file
```

### Analytics (autenticado)
```
GET    /forms/{id}/analytics?days=30  → AnalyticsResponse
```

### Upload (público)
```
POST   /upload/presign         ← PresignRequest → PresignResponse
POST   /upload/{id}/confirm    → 204
GET    /upload/{id}/download   → { downloadUrl, expiresIn }
GET    /upload/{id}            → FileInfoResponse
```

### Público (sem auth)
```
GET    /public/forms/{formId}  → PublicFormResponse
```

---

## 📊 Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Arquivos Java (backend) | ~55 |
| Arquivos TypeScript (frontend) | ~30 |
| Migrations SQL | 10 |
| Endpoints REST | 22 |
| Componentes Angular | 14 |
| Services Angular | 3 + AuthStore |
| Tipos de questão suportados | 14 |
| Linhas de código total | ~10.000 |