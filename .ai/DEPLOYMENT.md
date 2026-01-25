# Deployment

The application is deployed on Vercel with the frontend as a Next.js app and the backend as a Python serverless function.

## Vercel Configuration

**File**: `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "apps/api/index.py",
      "use": "@vercel/python",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/apps/api/index.py"
    },
    {
      "src": "/(.*)",
      "dest": "/apps/web/$1"
    }
  ]
}
```

### Build Configuration

| App | Builder | Config |
|-----|---------|--------|
| Frontend | `@vercel/next` | Standard Next.js build |
| Backend | `@vercel/python` | 50MB Lambda size limit |

### Routing

| Pattern | Destination |
|---------|-------------|
| `/api/*` | Python serverless function |
| `/*` | Next.js frontend |

## Environment Variables

### Required Variables

| Variable | Description | Where to Set |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Vercel Project Settings |

### Vercel Postgres

If using Vercel Postgres, these are auto-configured:
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_HOST`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

The backend checks for `POSTGRES_URL_NON_POOLING` in `database.py`.

## Deployment Process

### Automatic Deployments

1. Push to `main` branch triggers production deployment
2. Push to other branches creates preview deployments
3. Pull requests get preview URLs

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Prisma in Serverless

### Binary Targets

The Prisma schema includes binary targets for serverless:

```prisma
generator client {
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

- `native`: Local development (macOS, Windows, Linux desktop)
- `rhel-openssl-3.0.x`: Vercel/AWS Lambda (Amazon Linux 2)

### Engine Detection

`database.py` handles engine binary discovery:

```python
if platform.system() == "Linux":
    _engine_name = "prisma-query-engine-rhel-openssl-3.0.x"
    _possible_paths = [
        _api_dir / "prisma_client" / _engine_name,
        _api_dir / _engine_name,
        Path("/var/task") / "prisma_client" / _engine_name,
        Path("/var/task") / "apps" / "api" / "prisma_client" / _engine_name,
    ]
```

## Pre-deployment Checklist

### Code Quality

```bash
# Run all checks
pnpm lint
pnpm typecheck
pnpm test
```

### Database

```bash
# Ensure migrations are up to date
pnpm migrate

# Generate Prisma client
pnpm --filter api run prisma:generate
```

### Environment

1. Verify `DATABASE_URL` is set in Vercel
2. Check database is accessible from Vercel's network
3. Verify any other required environment variables

## Troubleshooting

### Build Failures

**Python dependencies**: Check `requirements.txt` is complete
```bash
# Regenerate from pyproject.toml if needed
cd apps/api
pip-compile pyproject.toml -o requirements.txt
```

**Prisma client**: Ensure client is generated
```bash
pnpm --filter api run prisma:generate
```

### Runtime Errors

**Database connection**: Check logs for Prisma errors
```bash
vercel logs
```

**Cold starts**: Python serverless functions have cold start latency
- Consider warming endpoints if needed
- Monitor function duration in Vercel dashboard

### Debug Endpoint

The `/api/debug` endpoint provides runtime information:
- Platform detection
- Working directory
- Prisma engine status
- Environment variable presence

```bash
curl https://your-app.vercel.app/api/debug
```

## Monitoring

### Vercel Dashboard

- Function invocations
- Error rates
- Build logs
- Runtime logs

### Health Check

Use the `/api/health` endpoint for uptime monitoring:

```bash
curl https://your-app.vercel.app/api/health
# Returns: {"ok": true}
```

GraphQL health query for detailed status:

```graphql
query {
  health {
    status
    database { status connection }
  }
}
```

## Cost Optimization

### Vercel Limits (Hobby)

- 100GB bandwidth/month
- Serverless function execution time: 10s (Hobby), 60s (Pro)
- Lambda size: 50MB configured

### Recommendations

1. Use connection pooling for database
2. Implement caching where appropriate
3. Optimize bundle sizes
4. Monitor function duration

## Local Production Build

Test production build locally:

```bash
# Build
pnpm build

# Start Next.js in production mode
cd apps/web && pnpm start

# Note: Python serverless can't be fully simulated locally
# Use development mode for backend testing
```
