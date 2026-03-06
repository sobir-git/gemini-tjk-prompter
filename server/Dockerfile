# Use multi-stage build with optimized layer caching
FROM node:22-alpine AS ui-builder
WORKDIR /frontend
# Copy only package files first for better caching
COPY client/package*.json ./
# Install dependencies (cached unless package files change)
RUN npm ci --only=production
# Copy source files (cached unless they change)
COPY client/ .
# Build the frontend
RUN npm run build

# Go builder stage with optimized caching
FROM golang:1.26-alpine AS builder
WORKDIR /app
# Copy go mod files first (cached unless they change)
COPY server/go.mod server/go.sum ./
# Download dependencies (cached unless go files change)
RUN go mod download
# Copy source files (cached unless they change)
COPY server/ .
# Copy built frontend from previous stage
COPY --from=ui-builder /frontend/dist ./web/dist
# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

# Final minimal runtime image
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
# Copy only the binary from builder stage
COPY --from=builder /app/server .
# Use non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup
USER appuser
EXPOSE 9000
# Health check for better monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1
CMD ["./server"]
