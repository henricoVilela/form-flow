  Os problemas reais para integração externa

  1. O payload não resolve labels de questões

  O GET /forms/{id}/responses/{responseId} retorna isso:
  {
    "id": "...",
    "payload": {
      "abc-123": { "type": "short_text", "value": "João Silva" },
      "def-456": { "type": "file_upload", "value": ["uuid-do-arquivo"] }
    }
  }

  O sistema externo recebe abc-123 e não sabe que é "Nome do cliente". Precisa cruzar com o schema do formulário
  manualmente — o que é trabalhoso e quebrável.

  2. Autenticação JWT não serve para integração M2M

  Toda a API exige token JWT de usuário logado. Um sistema externo não consegue usar isso de forma prática — precisa
   fazer login como usuário humano, o token expira, etc.

  3. Sem webhooks

  Não tem como um sistema externo ser notificado quando uma resposta nova chega. Ele precisaria fazer polling
  constante.

  4. Sem export JSON

  Só tem CSV. Para integração programática, JSON é muito mais útil.

  5. O ResponseLookupResponse resolve arquivos mas não outros tipos de resposta

  O /responses/{id} resolve metadados de arquivos e labels das questões de upload, mas para texto, múltipla escolha,
   etc., continua retornando os valores brutos sem contexto.

  ---
  O que eu sugiro implementar

  Prioridade Alta — sem isso integração é difícil

  A) Endpoint de resposta enriquecida — retorna respostas já com label de cada questão, sem precisar cruzar com o
  schema:

  GET /forms/{id}/responses/{responseId}/resolved

  {
    "id": "...",
    "submittedAt": "...",
    "answers": [
      {
        "questionId": "abc-123",
        "questionLabel": "Nome do cliente",
        "questionType": "short_text",
        "value": "João Silva"
      },
      {
        "questionId": "def-456",
        "questionLabel": "Comprovante",
        "questionType": "file_upload",
        "files": [
          { "fileId": "...", "originalName": "doc.pdf", "downloadUrl": "...", "mimeType": "application/pdf" }
        ]
      }
    ]
  }

  B) API Keys — chave estática que o usuário gera nas configurações, usada no header X-API-Key. Permite integração
  M2M sem JWT.

  Prioridade Média

  C) Webhooks — o usuário configura uma URL nas settings do formulário; quando uma resposta é submetida, fazemos
  POST com o payload resolvido.

  D) Export JSON — GET /forms/{id}/responses/export/json retornando array de respostas já resolvidas.

  Prioridade Baixa

  E) Rota pública de schema — GET /public/forms/{id}/schema retornando apenas as questões (id → label), para quem
  quiser resolver os payloads manualmente.
 

  Plano de Integração — Step by Step

  ---
  Fase 1 — Fundação (sem isso o resto não faz sentido)

  Step 1: Endpoint de resposta enriquecida ✅
  Criar GET /forms/{id}/responses/{responseId}/resolved que retorna respostas já com label de cada questão + URLs de
   download para arquivos. Base para tudo que vem depois — o webhook e o export JSON vão usar essa mesma estrutura.

  Step 2: Export JSON ✅
  GET /forms/{id}/responses/export/json — array de respostas resolvidas, pronto para consumir programaticamente.
  Aproveita a lógica do Step 1.

  ---
  Fase 2 — Acesso externo

  Step 3: API Keys ✅
  Gerar chaves estáticas nas configurações do usuário. Header X-API-Key como alternativa ao JWT. Sem isso, os steps
  seguintes não têm como ser usados por sistemas externos.

  Step 4: Rota de listagem via API Key ✅ (automático — filter autentica para todos os endpoints)
  Fix: JwtAuthFilter blindado para não quebrar com tokens malformados (ex: API Key no Authorization header).
  Liberar os endpoints de leitura de respostas para acesso com API Key (sem precisar de JWT). Inclui o endpoint
  resolvido do Step 1 e o export do Step 2.

  ---
  Fase 3 — Tempo real

  Step 5: Webhooks
  Campo webhookUrl nas settings do formulário. Quando uma resposta é submetida, dispara POST assíncrono com o
  payload resolvido (estrutura do Step 1). Retries automáticos com backoff.

  ---
  Ordem faz sentido porque:

  - Step 1 é a estrutura de dados que os outros consomem
  - Step 2 é trivial depois do 1
  - Step 3 é o mecanismo de auth que habilita acesso externo
  - Step 4 expõe o que foi construído nos steps 1-2 para sistemas externos
  - Step 5 usa a estrutura do Step 1 para notificar em tempo real