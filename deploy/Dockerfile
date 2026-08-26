FROM node:22-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY mcp-server ./mcp-server
COPY agent-server ./agent-server
COPY web ./web

EXPOSE 3000
CMD ["node", "agent-server/index.js"]
