package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"google.golang.org/genai"
)

const (
	systemInstruction = `Your task is to take raw voice dictation (which may be in any language, including Tajiki, Persian, Russian, or English) and translate it into clear, well-articulated English.

Focus on:
- Understanding the user's core intent from the speech
- Translating and articulating it clearly and naturally
- Maintaining the original meaning and tone
- Outputting only the refined text translated into English

Do not add explanations, preambles, or commentary. Simply provide the clear, articulated version of what the user said.

IMPORTANT: Do not engage in internal reasoning or thinking. Output immediately without deliberation.`

	maxGlobalRequestsPerHour = 100
	maxUserRequestsPerHour   = 20
	maxAudioSizeBytes        = 50 << 20 // 50MB
	geminiTimeoutSeconds     = 60
)

var modelThinkingStrategy = map[string]string{
	"gemini-2.5-flash":              "budget",
	"gemini-2.5-flash-lite":         "budget",
	"gemini-2.5-pro":                "",
	"gemini-2.0-flash":              "",
	"gemini-3-flash-preview":        "budget1",
	"gemini-3-pro-preview":          "budget1",
	"gemini-3.1-flash-lite-preview": "budget1",
	"gemini-3.1-pro-preview":        "budget1",
}

func thinkingConfigFor(model string) *genai.ThinkingConfig {
	strategy := modelThinkingStrategy[model]
	switch strategy {
	case "budget":
		zero := int32(0)
		return &genai.ThinkingConfig{ThinkingBudget: &zero}
	case "budget1":
		one := int32(1)
		return &genai.ThinkingConfig{ThinkingBudget: &one}
	default:
		return nil
	}
}

var allowedModels = map[string]bool{
	"gemini-2.5-flash":              true,
	"gemini-2.5-flash-lite":         true,
	"gemini-2.5-pro":                true,
	"gemini-2.0-flash":              true,
	"gemini-3-flash-preview":        true,
	"gemini-3-pro-preview":          true,
	"gemini-3.1-flash-lite-preview": true,
	"gemini-3.1-pro-preview":        true,
}

type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
}

func (rl *RateLimiter) checkLimit(ip string) error {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-time.Hour)

	times := rl.requests[ip]
	var recent []time.Time
	for _, t := range times {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}

	if len(recent) >= maxUserRequestsPerHour {
		return fmt.Errorf("rate limit exceeded")
	}

	rl.requests[ip] = append(recent, now)
	return nil
}

var limiter = &RateLimiter{
	requests: make(map[string][]time.Time),
}

var geminiClient *genai.Client

func getIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[len(parts)-1])
		if ip != "" {
			return ip
		}
	}
	ip := r.RemoteAddr
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}

type ModelResult struct {
	Model           string `json:"model"`
	OptimizedPrompt string `json:"optimized_prompt,omitempty"`
	Error           string `json:"error,omitempty"`
	TimeMs          int64  `json:"time_ms"`
}

type PromptResponse struct {
	Results      []ModelResult `json:"results"`
	ServerTimeMs int64         `json:"server_time_ms"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	allowedOrigin := os.Getenv("CORS_ORIGIN")
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowedOrigin == "" || allowedOrigin == "*" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else if origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func writeError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(ErrorResponse{Error: msg})
}

//go:embed web/dist
var embeddedStatic embed.FS

var spaFS fs.FS

func init() {
	var err error
	spaFS, err = fs.Sub(embeddedStatic, "web/dist")
	if err != nil {
		log.Fatal("Failed to load embedded static files:", err)
	}
}

func processAudioHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ip := getIP(r)
	if err := limiter.checkLimit(ip); err != nil {
		writeError(w, err.Error(), http.StatusTooManyRequests)
		return
	}

	startTime := time.Now()

	r.Body = http.MaxBytesReader(w, r.Body, maxAudioSizeBytes+1<<20)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, "request too large or malformed", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("audio")
	if err != nil {
		writeError(w, "audio field missing", http.StatusBadRequest)
		return
	}
	defer file.Close()

	if header.Size > maxAudioSizeBytes {
		writeError(w, "audio file too large (max 50MB)", http.StatusBadRequest)
		return
	}

	audioBytes, err := io.ReadAll(io.LimitReader(file, maxAudioSizeBytes))
	if err != nil {
		log.Printf("ERROR: failed to read audio: %v", err)
		writeError(w, "failed to read audio", http.StatusInternalServerError)
		return
	}

	mimeType := header.Header.Get("Content-Type")
	switch mimeType {
	case "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/flac":
		// accepted
	default:
		mimeType = "audio/webm"
	}

	modelsStr := r.FormValue("models")
	var selectedModels []string
	if modelsStr != "" {
		for _, m := range strings.Split(modelsStr, ",") {
			m = strings.TrimSpace(m)
			m = strings.TrimPrefix(m, "models/")
			if allowedModels[m] {
				selectedModels = append(selectedModels, m)
			}
		}
	}
	if len(selectedModels) == 0 {
		selectedModels = []string{"gemini-2.5-flash"}
	}

	parts := []*genai.Part{
		genai.NewPartFromText("Translate and articulate the following voice dictation clearly:"),
		{
			InlineData: &genai.Blob{
				MIMEType: mimeType,
				Data:     audioBytes,
			},
		},
	}

	contents := []*genai.Content{
		genai.NewContentFromParts(parts, genai.RoleUser),
	}

	var results []ModelResult
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, modelName := range selectedModels {
		wg.Add(1)
		go func(m string) {
			defer wg.Done()

			ctx, cancel := context.WithTimeout(context.Background(), geminiTimeoutSeconds*time.Second)
			defer cancel()

			cfg := &genai.GenerateContentConfig{
				SystemInstruction: genai.NewContentFromText(systemInstruction, genai.RoleUser),
				ThinkingConfig:    thinkingConfigFor(m),
			}

			startModelTime := time.Now()
			res, err := geminiClient.Models.GenerateContent(ctx, m, contents, cfg)
			modelTime := time.Since(startModelTime).Milliseconds()

			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				log.Printf("ERROR: Gemini model %s failed: %v", m, err)
				logUsage(m, "error", modelTime)
				results = append(results, ModelResult{
					Model:  m,
					Error:  "model request failed",
					TimeMs: modelTime,
				})
				return
			}

			logUsage(m, "success", modelTime)
			results = append(results, ModelResult{
				Model:           m,
				OptimizedPrompt: res.Text(),
				TimeMs:          modelTime,
			})
		}(modelName)
	}

	wg.Wait()

	serverTimeMs := time.Since(startTime).Milliseconds()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(PromptResponse{
		Results:      results,
		ServerTimeMs: serverTimeMs,
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func spaHandler() http.Handler {
	fileServer := http.FileServer(http.FS(spaFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requested := strings.TrimPrefix(r.URL.Path, "/")
		if requested == "" {
			requested = "index.html"
		}

		if _, err := fs.Stat(spaFS, requested); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}

		rCopy := *r
		rCopy.URL.Path = "/index.html"
		fileServer.ServeHTTP(w, &rCopy)
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}

	apiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if apiKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable is required.")
	}

	var err error
	geminiClient, err = genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		log.Fatalf("failed to create Gemini client: %v", err)
	}

	// Initialize telemetry database
	initDB()

	if os.Getenv("CORS_ORIGIN") == "" {
		log.Println("WARNING: CORS_ORIGIN not set — all origins are allowed. Set it to your frontend URL in production.")
	}

	// API routes
	http.HandleFunc("/health", corsMiddleware(healthHandler))
	http.HandleFunc("/api/process-audio", corsMiddleware(processAudioHandler))
	http.HandleFunc("/api/telemetry", telemetryHandler)

	// Frontend
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/health" {
			http.NotFound(w, r)
			return
		}
		spaHandler().ServeHTTP(w, r)
	})

	log.Printf("Server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
