FROM node:20-slim

# Install dependencies required by Puppeteer (kept for any legacy PDF fallback)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install ONLY production dependencies to keep the image lean
RUN npm ci --only=production

# Copy application source code
COPY . .

# Ensure correct permissions
RUN chown -R node:node /app
USER node

# Expose production port
EXPOSE 5000

# Start production server
CMD ["node", "server.js"]
