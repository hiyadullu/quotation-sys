# Production image: API + built web app in one container. (Not exercised in the authoring
# environment — see README "Deploying" for what to verify on your first deploy.)
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium renders the PDFs. fonts-noto-core keeps non-Latin names legible.
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-noto-core ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

# devDependencies are needed to build; NODE_ENV is switched on only after.
RUN NODE_ENV=development npm ci && npm run build

ENV PORT=4000
EXPOSE 4000
# Apply pending migrations, then start the server.
CMD ["sh", "-c", "npm run db:deploy && npm run start"]
