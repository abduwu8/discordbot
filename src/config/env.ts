import 'dotenv/config';
import { z } from 'zod';

const trim = (value: unknown) => (typeof value === 'string' ? value.trim() : value);

const envSchema = z.object({
  DISCORD_TOKEN: z.preprocess(trim, z.string().min(1, 'DISCORD_TOKEN is required')),
  CLIENT_ID: z.preprocess(trim, z.string().min(1, 'CLIENT_ID is required')),
  GUILD_ID: z.preprocess(trim, z.string().min(1, 'GUILD_ID is required')),
  SUPABASE_URL: z.preprocess(trim, z.string().url('SUPABASE_URL must be a valid URL')),
  SUPABASE_ANON_KEY: z.preprocess(trim, z.string().min(1, 'SUPABASE_ANON_KEY is required')),
  GROQ_API_KEY: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : trim(value)),
    z.string().min(1).optional(),
  ),
  GROQ_AI_API_KEY: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : trim(value)),
    z.string().min(1).optional(),
  ),
  NODE_ENV: z.preprocess((value) => {
    if (value === '' || value === undefined) {
      return 'production';
    }
    // Render dashboard often has NODE_ENV=development from a copied .env.
    if (process.env.RENDER && value === 'development') {
      return 'production';
    }
    return value;
  }, z.enum(['development', 'production', 'test'], {
    errorMap: () => ({ message: 'NODE_ENV must be development, production, or test' }),
  })),
  PORT: z.preprocess((value) => {
    if (value === '' || value === undefined) {
      return 10000;
    }
    return Number(value);
  }, z.number().int().positive()),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');

    console.error('Invalid environment configuration:\n' + details);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
