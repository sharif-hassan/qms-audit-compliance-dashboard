# Use Node.js 20 Alpine
FROM node:20-alpine

WORKDIR /app

# Copy backend package files and install
COPY package*.json ./
RUN npm install

# Copy all backend code
COPY . .

# Expose backend port
EXPOSE 3001

# Command: migrate + seed backend, then run dev server
# Frontend will be run via a separate npm script from host
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm run dev"]