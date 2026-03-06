package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

// initDB initializes SQLite database for telemetry
func initDB() {
	var err error
	dbPath := os.Getenv("TELEMETRY_DB_PATH")
	if dbPath == "" {
		dbPath = "telemetry.db"
	}
	
	// Ensure directory exists with proper permissions
	if dir := os.Getenv("TELEMETRY_DB_PATH"); dir != "" {
		// Extract directory from full path
		dirPath := dir[:len(dir)-len("/telemetry.db")]
		if err := os.MkdirAll(dirPath, 0755); err != nil {
			log.Printf("WARNING: Failed to create database directory: %v", err)
			return
		}
	}
	
	// Open database with connection string parameters for better compatibility
	db, err = sql.Open("sqlite3", dbPath+"?cache=shared&mode=rwc")
	if err != nil {
		log.Printf("WARNING: Failed to open SQLite database: %v", err)
		log.Printf("INFO: Telemetry will be disabled. Application will continue without it.")
		return
	}
	
	// Test connection
	if err := db.Ping(); err != nil {
		log.Printf("WARNING: Failed to ping SQLite database: %v", err)
		log.Printf("INFO: This may be due to volume mount permissions on Railway.")
		log.Printf("INFO: Telemetry will be disabled. Application will continue without it.")
		db.Close()
		db = nil
		return
	}
	
	// Create telemetry table if it doesn't exist
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS usage (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		model TEXT NOT NULL,
		status TEXT NOT NULL,
		duration_ms INTEGER NOT NULL
	);
	
	CREATE INDEX IF NOT EXISTS idx_timestamp ON usage(timestamp);
	CREATE INDEX IF NOT EXISTS idx_model ON usage(model);

	CREATE TABLE IF NOT EXISTS feedback (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		email TEXT,
		message TEXT NOT NULL
	);
	`
	
	if _, err := db.Exec(createTableSQL); err != nil {
		log.Printf("WARNING: Failed to create telemetry table: %v", err)
		db.Close()
		db = nil
		return
	}
	
	// Clean up old entries (older than 30 days) on startup
	cleanupSQL := `DELETE FROM usage WHERE timestamp < datetime('now', '-30 days');`
	if _, err := db.Exec(cleanupSQL); err != nil {
		log.Printf("WARNING: Failed to cleanup old telemetry data: %v", err)
	}
	
	log.Println("SQLite telemetry database initialized successfully")
}

// logUsage stores anonymous telemetry data in SQLite
func logUsage(model, status string, durationMs int64) {
	if db == nil {
		return // Silently fail if DB not available
	}

	// Insert asynchronously to avoid blocking the main request
	go func() {
		insertSQL := `INSERT INTO usage (model, status, duration_ms) VALUES (?, ?, ?)`
		if _, err := db.Exec(insertSQL, model, status, durationMs); err != nil {
			// Silently fail - don't affect main application
			return
		}
	}()
}

// SaveFeedback stores a contact/feedback message in SQLite
func SaveFeedback(email, message string) error {
	if db == nil {
		return fmt.Errorf("database not available")
	}

	insertSQL := `INSERT INTO feedback (email, message) VALUES (?, ?)`
	_, err := db.Exec(insertSQL, email, message)
	return err
}

// TelemetryStats represents summary statistics
type TelemetryStats struct {
	TotalRequests int
	SuccessCount  int
	ErrorCount    int
	AvgDurationMs float64
	UniqueModels  int
}

// ModelStat represents per-model statistics
type ModelStat struct {
	Model       string
	Count       int
	AvgDuration float64
	ErrorRate   float64
}

// TelemetryEvent represents a single telemetry event
type TelemetryEvent struct {
	Timestamp  string `json:"timestamp"`
	Model      string `json:"model"`
	Status     string `json:"status"`
	DurationMs int64  `json:"duration_ms"`
}

// FeedbackEvent represents a single feedback submission
type FeedbackEvent struct {
	ID        int    `json:"id"`
	Timestamp string `json:"timestamp"`
	Email     string `json:"email"`
	Message   string `json:"message"`
}

// PaginationInfo contains pagination metadata
type PaginationInfo struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasNext    bool `json:"hasNext"`
	HasPrev    bool `json:"hasPrev"`
}

// PaginatedEvents contains events and pagination info
type PaginatedEvents struct {
	Data       []TelemetryEvent `json:"data"`
	Pagination PaginationInfo   `json:"pagination"`
}

// GetFeedbacks retrieves the latest feedback submissions
func GetFeedbacks(limit int) ([]FeedbackEvent, error) {
	if db == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT id, timestamp, email, message
		FROM feedback 
		ORDER BY timestamp DESC 
		LIMIT ?
	`

	rows, err := db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var feedbacks []FeedbackEvent
	for rows.Next() {
		var f FeedbackEvent
		if err := rows.Scan(&f.ID, &f.Timestamp, &f.Email, &f.Message); err != nil {
			continue
		}
		feedbacks = append(feedbacks, f)
	}

	return feedbacks, nil
}

// GetTelemetryStats retrieves summary statistics for the given time range
func GetTelemetryStats(timeRange string) (*TelemetryStats, error) {
	if db == nil {
		return nil, fmt.Errorf("database not available")
	}

	whereClause := getWhereClause(timeRange)
	
	statsQuery := fmt.Sprintf(`
		SELECT 
			COUNT(*) as total_requests,
			COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
			COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
			COALESCE(AVG(duration_ms), 0) as avg_duration_ms,
			COUNT(DISTINCT model) as unique_models
		FROM usage 
		%s
	`, whereClause)
	
	var stats TelemetryStats
	err := db.QueryRow(statsQuery).Scan(
		&stats.TotalRequests,
		&stats.SuccessCount,
		&stats.ErrorCount,
		&stats.AvgDurationMs,
		&stats.UniqueModels,
	)
	
	return &stats, err
}

// GetModelStats retrieves per-model statistics for the given time range
func GetModelStats(timeRange string) ([]ModelStat, error) {
	if db == nil {
		return nil, fmt.Errorf("database not available")
	}

	whereClause := getWhereClause(timeRange)
	
	modelQuery := fmt.Sprintf(`
		SELECT 
			model,
			COUNT(*) as count,
			COALESCE(AVG(duration_ms), 0) as avg_duration,
			COALESCE(COUNT(CASE WHEN status = 'error' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 0) as error_rate
		FROM usage 
		%s
		GROUP BY model 
		ORDER BY count DESC
	`, whereClause)
	
	rows, err := db.Query(modelQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var stats []ModelStat
	for rows.Next() {
		var stat ModelStat
		if err := rows.Scan(&stat.Model, &stat.Count, &stat.AvgDuration, &stat.ErrorRate); err != nil {
			continue
		}
		stats = append(stats, stat)
	}
	
	return stats, nil
}

// GetPaginatedEvents retrieves paginated telemetry events
func GetPaginatedEvents(timeRange string, page, limit int) (*PaginatedEvents, error) {
	if db == nil {
		return nil, fmt.Errorf("database not available")
	}

	whereClause := getWhereClause(timeRange)
	offset := (page - 1) * limit
	
	// Get total count
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM usage %s`, whereClause)
	var total int
	if err := db.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, err
	}
	
	// Get paginated data
	query := fmt.Sprintf(`
		SELECT timestamp, model, status, duration_ms
		FROM usage 
		%s 
		ORDER BY timestamp DESC 
		LIMIT ? OFFSET ?
	`, whereClause)
	
	rows, err := db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var events []TelemetryEvent
	for rows.Next() {
		var event TelemetryEvent
		if err := rows.Scan(&event.Timestamp, &event.Model, &event.Status, &event.DurationMs); err != nil {
			continue
		}
		events = append(events, event)
	}
	
	// Calculate pagination info
	totalPages := (total + limit - 1) / limit
	
	return &PaginatedEvents{
		Data: events,
		Pagination: PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
			HasNext:    page < totalPages,
			HasPrev:    page > 1,
		},
	}, nil
}

func getWhereClause(timeRange string) string {
	switch timeRange {
	case "1d":
		return "WHERE timestamp >= datetime('now', '-1 day')"
	case "7d":
		return "WHERE timestamp >= datetime('now', '-7 days')"
	case "30d":
		return "WHERE timestamp >= datetime('now', '-30 days')"
	default:
		return ""
	}
}
