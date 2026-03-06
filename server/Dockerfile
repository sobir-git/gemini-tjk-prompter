# Use multi-stage build with optimized layer caching
FROM node:22-alpine AS ui-builder
WORKDIR /frontend
# Copy only package files first for better caching
COPY client/package*.json ./
# Install dependencies
RUN npm install
# Copy source files
COPY client/ .
# Build the frontend
RUN npm run build

# Go builder stage with optimized caching
FROM golang:1.26-alpine AS builder
WORKDIR /app
# Install SQLite development dependencies and build tools for CGO
RUN apk add --no-cache sqlite-dev build-base
# Copy go mod files first (cached unless they change)
COPY server/go.mod server/go.sum ./
# Download dependencies
RUN go mod download
# Copy source files
COPY server/ .
# Create the directory for built frontend
RUN mkdir -p web/dist
# Copy built frontend from previous stage
COPY --from=ui-builder /frontend/dist ./web/dist
# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o server .

# Final minimal runtime image
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata sqlite sqlite-libs
WORKDIR /app

# Use non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Install su-exec for switching users
RUN apk --no-cache add su-exec

# Copy only the binary from builder stage
COPY --from=builder /app/server .

# Copy entrypoint script from builder stage (already copied with server/ directory)
COPY --from=builder /app/entrypoint.sh .
RUN chmod +x entrypoint.sh

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Set default DB path to the persistent volume
ENV TELEMETRY_DB_PATH=/app/data/telemetry.db
# Railway sets PORT env var
EXPOSE 8080
ENTRYPOINT ["./entrypoint.sh"]
