# HGU AI Clínico

Sistema de apoio ao diagnóstico com Inteligência Artificial para profissionais de saúde do **Hospital Geral do Uíge**, Província do Uíge, Angola.

---

## Funcionalidades

- **Chat clínico assistido por IA** — baseado em Grok (xAI), contextualizado para as doenças prioritárias do Uíge (paludismo, tuberculose, doenças diarreicas, saúde materno-infantil)
- **Análise de imagens clínicas** — upload de raio-X, feridas e lesões com análise automática por IA com visão
- **Relatórios PDF automáticos** — geração de relatórios clínicos estruturados com resumo da IA
- **Multi-idioma** — Português e Kikongo
- **Triagem por urgência** — classificação automática Verde / Amarelo / Vermelho em cada resposta
- **Histórico de consultas** — armazenamento seguro no Firestore com todos os dados clínicos
- **Autenticação segura** — acesso restrito a profissionais do HGU via Firebase Auth

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + React 18 |
| IA | Grok API (xAI) — modelos llama-3.2-90b-vision + llama-3.3-70b |
| Base de dados | Firebase Firestore |
| Autenticação | Firebase Auth |
| Armazenamento | Firebase Storage |
| PDF | jsPDF + jspdf-autotable |
| Estilos | Tailwind CSS |
| Deploy | Vercel |
| Idiomas | Português + Kikongo |

---

## Instalação e configuração

### 1. Pré-requisitos

- Node.js 18+ instalado
- Conta Firebase (gratuita)
- Chave de API do Grok em https://console.x.ai
- Conta Vercel (para deploy)

### 2. Clonar e instalar dependências

```bash
git clone https://github.com/teu-usuario/hgu-ai-clinico.git
cd hgu-ai-clinico
npm install
```

### 3. Configurar Firebase

1. Vai a https://console.firebase.google.com
2. Cria um novo projecto: **hgu-ai-clinico**
3. Activa **Authentication** → Email/Password
4. Activa **Firestore Database** → modo produção
5. Activa **Storage**
6. Em **Definições do projecto → Aplicações web**, copia as credenciais

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edita .env.local com os teus valores
```

Preenche todas as variáveis em `.env.local`:

```env
GROK_API_KEY=xai-...
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=hgu-ai-clinico.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=hgu-ai-clinico
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=hgu-ai-clinico.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

Para o `FIREBASE_SERVICE_ACCOUNT_KEY`:
1. Firebase Console → Definições do projecto → Contas de serviço
2. Gera nova chave privada → descarrega JSON
3. Copia o conteúdo JSON completo (numa única linha) para a variável

### 5. Aplicar regras de segurança

```bash
# Instala Firebase CLI
npm install -g firebase-tools
firebase login
firebase init firestore
firebase init storage

# Aplica as regras
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### 6. Criar o primeiro utilizador profissional

Usa o Firebase Console → Authentication → Adicionar utilizador:
- Email: `nome@hgu.ao`
- Password: (define uma segura)

Depois, no Firestore → Colecção `profissionais` → Adiciona documento com o UID do utilizador:

```json
{
  "uid": "UID_DO_UTILIZADOR",
  "email": "nome@hgu.ao",
  "nome": "Dr. João Silva",
  "role": "medico",
  "departamento": "Medicina Interna",
  "hospital": "Hospital Geral do Uíge",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### 7. Executar em desenvolvimento

```bash
npm run dev
# Abre http://localhost:3000
```

---

## Deploy na Vercel

```bash
# Instala CLI da Vercel
npm install -g vercel

# Deploy
vercel

# Em produção
vercel --prod
```

Adiciona todas as variáveis de ambiente no painel da Vercel:
Settings → Environment Variables

---

## Estrutura do projecto

```
hgu-ai-clinico/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # API chat com Grok
│   │   ├── report/route.ts      # Geração de PDF
│   │   └── upload/route.ts      # Upload de imagens
│   ├── auth/page.tsx            # Página de login
│   ├── dashboard/page.tsx       # Dashboard principal
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── ChatWindow.tsx           # Interface do chatbot
├── hooks/
│   ├── useAuth.ts               # Estado de autenticação
│   └── useChat.ts               # Estado do chat
├── lib/
│   ├── firebase.ts              # Firebase cliente
│   ├── firebase-admin.ts        # Firebase servidor
│   ├── grok.ts                  # Cliente Grok + prompts
│   └── pdf.ts                   # Gerador PDF
├── public/
│   └── locales/
│       ├── pt/common.json       # Traduções Português
│       └── kg/common.json       # Traduções Kikongo
├── types/index.ts               # Tipos TypeScript
├── firestore.rules              # Regras Firestore
├── storage.rules                # Regras Storage
└── .env.example                 # Template de variáveis
```

---

## Doenças prioritárias configuradas

O sistema está optimizado para o contexto epidemiológico do Uíge:

| Doença | Detecção automática | Protocolo MINSA |
|--------|--------------------|--------------------|
| Paludismo (Malária P. falciparum) | Sim | Sim |
| Tuberculose pulmonar | Sim | Sim |
| Doenças diarreicas / Cólera | Sim | Sim |
| Saúde materno-infantil | Sim | Sim |

---

## Avisos legais e éticos

> **IMPORTANTE**: Este sistema é uma ferramenta de **apoio ao diagnóstico** e **NÃO substitui** o julgamento clínico do profissional de saúde. O diagnóstico definitivo é da responsabilidade exclusiva do médico assistente.

- Todos os dados clínicos são armazenados de forma segura e encriptada
- O acesso é restrito a profissionais autenticados do HGU
- Os relatórios gerados devem ser validados pelo médico responsável
- Conteúdo gerado pela IA deve ser sempre interpretado por um profissional qualificado

---

## Suporte e contacto

Para questões técnicas ou clínicas relacionadas com o sistema:
- **Hospital Geral do Uíge** — Direcção de Informática
- Desenvolvido no âmbito do estudo sobre IA na Saúde — IPPG Uíge, 2025/2026

---

*© 2025 Hospital Geral do Uíge · Ministério da Saúde de Angola*
