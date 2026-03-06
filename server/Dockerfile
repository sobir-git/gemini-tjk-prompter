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
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

# Final minimal runtime image
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R 1001:1001 /app/data

# Copy only the binary from builder stage
COPY --from=builder /app/server .
# Use non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

USER appuser

# Set default DB path to the persistent volume
ENV TELEMETRY_DB_PATH=/app/data/telemetry.db
# Railway sets PORT env var
EXPOSE 8080
CMD ["./server"]
