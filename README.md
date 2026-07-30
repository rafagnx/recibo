# Recibo App

## 🚀 Deploy no Vercel + Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/migrations/001_init.sql`
3. Vá em **Settings > API** e copie a **URL** e a **Anon Key**
4. No app, vá em **Configurações > Supabase** e cole as chaves
5. Faça deploy no Vercel conectando seu repositório GitHub

## 📦 Estrutura

```
recibo/
├── index.html
├── vercel.json
├── .gitignore
├── css/
│   ├── styles.css
│   └── print.css
├── js/
│   ├── db.js              ← localStorage (fallback)
│   ├── supabase-config.js  ← Config do Supabase
│   ├── supabase-db.js      ← Supabase DB layer
│   ├── utils.js
│   ├── app.js
│   ├── tenants.js
│   ├── contracts.js
│   └── receipts.js
└── supabase/
    └── migrations/
        └── 001_init.sql
```
