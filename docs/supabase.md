# Supabase Database Integration Guide

Nomi AI natively supports **Supabase PostgreSQL** for persistent, cloud-hosted production storage alongside local SQLite development.

---

## 1. Quick Setup in Supabase

1. Go to [database.new](https://database.new) and create a free Supabase project.
2. In the Supabase Dashboard, navigate to **Project Settings** -> **Database**.
3. Under **Connection string**, select **URI** and copy your database URI:
   ```env
   postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```
4. In the Supabase Dashboard, navigate to **SQL Editor** -> **New Query**.
5. Paste and execute the contents of [`backend/supabase_schema.sql`](../backend/supabase_schema.sql).

---

## 2. Configure Nomi AI Backend

In `backend/.env`, set `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
```

Restart the FastAPI backend:
```bash
uvicorn app.main:app --reload
```

FastAPI will automatically connect to Supabase with connection pooling enabled.
