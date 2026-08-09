FROM node:20-alpine

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend .

# Build with a placeholder that gets replaced at runtime
ENV NEXT_PUBLIC_API_URL=NEXT_PUBLIC_API_URL_PLACEHOLDER

RUN npm run build

COPY frontend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "start"]
