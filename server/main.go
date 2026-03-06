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

const systemInstruction = `Your task is to take raw voice dictation (which may be in any language, including Tajiki, Persian, Russian, or English) and translate it into clear, well-articulated English.

Focus on:
- Understanding the user's core intent from the speech
- Translating and articulating it clearly and naturally
- Maintaining the original meaning and tone
- Outputting only the refined text translated into English

Do not add explanations, preambles, or commentary. Simply provide the clear, articulated version of what the user said.`

type ModelResult struct {
	Model           string `json:"model"`
	OptimizedPrompt string `json:"optimized_prompt"`
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
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
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


//go:embed web/dist/*
var embeddedStatic embed.FS

var spaFS fs.FS

func init() {
	var err error
	spaFS, err = fs.Sub(embeddedStatic, "web/dist")
	if err != nil {
		log.Printf("warning: failed to load embedded frontend (did you run npm run build?): %v", err)
	}
}

func processAudioHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	
	if r.Method != http.MethodPost {
		writeError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseMultipartForm(25 << 20); err != nil {
		writeError(w, "failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("audio")
	if err != nil {
		writeError(w, "audio field missing: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	audioBytes, err := io.ReadAll(file)
	if err != nil {
		writeError(w, "failed to read audio: "+err.Error(), http.StatusInternalServerError)
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "audio/webm"
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  os.Getenv("GEMINI_API_KEY"),
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		writeError(w, "failed to create Gemini client: "+err.Error(), http.StatusInternalServerError)
		return
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

	config := &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(systemInstruction, genai.RoleUser),
	}

	modelsStr := r.FormValue("models")
	var selectedModels []string
	if modelsStr != "" {
		for _, m := range strings.Split(modelsStr, ",") {
			m = strings.TrimSpace(m)
			m = strings.TrimPrefix(m, "models/")
			if m != "" {
				selectedModels = append(selectedModels, m)
			}
		}
	}
	if len(selectedModels) == 0 {
		selectedModels = []string{"gemini-2.5-flash"}
	}

	var results []ModelResult
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, modelName := range selectedModels {
		wg.Add(1)
		go func(m string) {
			defer wg.Done()
			startModelTime := time.Now()
			res, err := client.Models.GenerateContent(ctx, m, contents, config)
			modelTime := time.Since(startModelTime).Milliseconds()

			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				results = append(results, ModelResult{
					Model: m,
					Error: err.Error(),
					TimeMs: modelTime,
				})
				return
			}

			optimizedPrompt := res.Text()
			results = append(results, ModelResult{
				Model: m,
				OptimizedPrompt: optimizedPrompt,
				TimeMs: modelTime,
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
	fmt.Fprintln(w, `{"status":"ok"}`)
}

func spaHandler() http.Handler {
	if spaFS == nil {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "frontend not built", http.StatusNotFound)
		})
	}

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

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable is required. Set it in your .env file.")
	}

// API routes
	http.HandleFunc("/health", corsMiddleware(healthHandler))
	http.HandleFunc("/api/process-audio", corsMiddleware(processAudioHandler))

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
