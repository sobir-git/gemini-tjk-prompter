package main

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"os"
	"strconv"
	"strings"
)

func telemetryHandler(w http.ResponseWriter, r *http.Request) {
	// Basic authentication
	username := os.Getenv("TELEMETRY_USER")
	password := os.Getenv("TELEMETRY_PASSWORD")
	
	if username == "" || password == "" {
		http.Error(w, "Telemetry not configured", http.StatusNotFound)
		return
	}
	
	user, pass, ok := r.BasicAuth()
	if !ok || user != username || pass != password {
		w.Header().Set("WWW-Authenticate", `Basic realm="Telemetry"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	
	// Handle different content types based on Accept header
	accept := r.Header.Get("Accept")
	
	if strings.Contains(accept, "application/json") {
		serveTelemetryJSON(w, r)
	} else {
		serveTelemetryHTML(w, r, username, password)
	}
}

func serveTelemetryJSON(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	timeRange := r.URL.Query().Get("range")
	if timeRange == "" {
		timeRange = "7d"
	}
	
	// Parse pagination
	page := 1
	limit := 20
	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	
	result, err := GetPaginatedEvents(timeRange, page, limit)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}

	feedbacks, err := GetFeedbacks(100) // limit to 100 latest feedbacks
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	
	response := struct {
		Events    *PaginatedEvents `json:"events"`
		Feedbacks []FeedbackEvent  `json:"feedbacks"`
	}{
		Events:    result,
		Feedbacks: feedbacks,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func serveTelemetryHTML(w http.ResponseWriter, r *http.Request, username, password string) {
	timeRange := "7d"
	
	stats, err := GetTelemetryStats(timeRange)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	
	// Handle case where there's no data
	if stats.TotalRequests == 0 {
		renderEmptyDashboard(w)
		return
	}
	
	modelStats, err := GetModelStats(timeRange)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}

	feedbacks, err := GetFeedbacks(50)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	
	renderDashboard(w, stats, modelStats, feedbacks, username, password, r.Host)
}

func renderEmptyDashboard(w http.ResponseWriter) {
	html := `
<!DOCTYPE html>
<html>
<head>
    <title>Telemetry Dashboard</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Telemetry Dashboard</h1>
        <div class="card">
            <p>No telemetry data available yet. Make some API calls to see usage statistics.</p>
        </div>
    </div>
</body>
</html>`
	
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, html)
}

func renderDashboard(w http.ResponseWriter, stats *TelemetryStats, modelStats []ModelStat, feedbacks []FeedbackEvent, username, password, host string) {
	_ = username
	_ = password
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>Telemetry Dashboard</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat { text-align: center; }
        .stat h3 { margin: 0; color: #333; }
        .stat .value { font-size: 2em; font-weight: bold; color: #007bff; }
        table { width: 100%%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .error { color: #dc3545; }
        .success { color: #28a745; }
        .refresh-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #0056b3; }
        .pagination { display: flex; justify-content: center; gap: 10px; margin-top: 20px; }
        .pagination button { padding: 8px 16px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; }
        .pagination button:hover { background: #f8f9fa; }
        .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination button.active { background: #007bff; color: white; }
        .events-table { max-height: 400px; overflow-y: auto; }
        .loading { text-align: center; padding: 20px; color: #666; }
        .event-row { transition: background-color 0.2s; }
        .event-row:hover { background-color: #f8f9fa; }
        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
        .status-success { background-color: #d4edda; color: #155724; }
        .status-error { background-color: #f8d7da; color: #721c24; }
        .feedback-message { white-space: pre-wrap; font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Telemetry Dashboard</h1>
        <p>Last 7 days of anonymous usage data</p>
        <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh</button>
        
        <div class="card">
            <h2>Summary Statistics</h2>
            <div class="stats">
                <div class="stat">
                    <h3>Total Requests</h3>
                    <div class="value">%d</div>
                </div>
                <div class="stat">
                    <h3>Success Rate</h3>
                    <div class="value success">%.1f%%</div>
                </div>
                <div class="stat">
                    <h3>Avg Duration</h3>
                    <div class="value">%.0fms</div>
                </div>
                <div class="stat">
                    <h3>Models Used</h3>
                    <div class="value">%d</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>Model Usage Breakdown</h2>
            <table>
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Requests</th>
                        <th>Avg Duration</th>
                        <th>Error Rate</th>
                    </tr>
                </thead>
                <tbody>
                    %s
                </tbody>
            </table>
        </div>
        
        <div class="card">
            <h2>Feedback & Contact Submissions</h2>
            <div class="events-table">
                <table>
                    <thead>
                        <tr>
                            <th width="150">Time</th>
                            <th width="200">Email</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        %s
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card">
            <h2>Recent Events</h2>
            <div id="events-container">
                <div class="loading">Loading events...</div>
            </div>
        </div>
        
        <div class="card">
            <h2>API Access</h2>
            <p>You can access this data as JSON via Basic Auth:</p>
            <code>curl -u USER:PASS -H "Accept: application/json" https://%s/api/telemetry</code>
        </div>
    </div>

    <script>
        async function loadEvents(page = 1) {
            const container = document.getElementById('events-container');
            container.innerHTML = '<div class="loading">Loading events...</div>';
            
            try {
                const response = await fetch('/api/telemetry?page=' + page + '&limit=20', {
                    headers: {
                        'Accept': 'application/json'
                    },
                    credentials: 'include'
                });
                
                if (!response.ok) throw new Error('Failed to load events');
                
                const result = await response.json();
                renderEvents(result.events.data, result.events.pagination);
            } catch (error) {
                container.innerHTML = '<div class="error">Failed to load events</div>';
            }
        }
        
        function renderEvents(events, pagination) {
            const container = document.getElementById('events-container');
            
            if (!events || events.length === 0) {
                container.innerHTML = '<p>No events found</p>';
                return;
            }
            
            let html = '<div class="events-table"><table><thead><tr><th>Time</th><th>Model</th><th>Status</th><th>Duration</th></tr></thead><tbody>';
            
            events.forEach(event => {
                const time = new Date(event.timestamp).toLocaleString();
                const statusClass = event.status === 'success' ? 'status-success' : 'status-error';
                const statusText = event.status === 'success' ? '✓ Success' : '✗ Error';
                
                html += '<tr class="event-row">';
                html += '<td>' + time + '</td>';
                html += '<td><code>' + event.model + '</code></td>';
                html += '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>';
                html += '<td>' + event.duration_ms + 'ms</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
            
            // Add pagination
            html += '<div class="pagination">';
            if (pagination.hasPrev) {
                html += '<button onclick="loadEvents(' + (pagination.page - 1) + ')">← Previous</button>';
            }
            
            const maxPages = Math.min(pagination.totalPages, 10);
            for (let i = 1; i <= maxPages; i++) {
                const active = i === pagination.page ? 'active' : '';
                html += '<button class="' + active + '" onclick="loadEvents(' + i + ')">' + i + '</button>';
            }
            
            if (pagination.hasNext) {
                html += '<button onclick="loadEvents(' + (pagination.page + 1) + ')">Next →</button>';
            }
            
            html += '</div>';
            html += '<p style="text-align: center; color: #666; margin-top: 10px;">';
            html += 'Showing ' + ((pagination.page - 1) * pagination.limit + 1) + '-' + Math.min(pagination.page * pagination.limit, pagination.total) + ' of ' + pagination.total + ' events';
            html += '</p>';
            
            container.innerHTML = html;
        }
        
        loadEvents();
    </script>
</body>
</html>`,
		stats.TotalRequests,
		float64(stats.SuccessCount)/float64(stats.TotalRequests)*100,
		stats.AvgDurationMs,
		stats.UniqueModels,
		generateModelTableRows(modelStats),
		generateFeedbackTableRows(feedbacks),
		host,
	)
	
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, html)
}

func generateModelTableRows(stats []ModelStat) string {
	var rows strings.Builder
	for _, stat := range stats {
		errorClass := "success"
		if stat.ErrorRate > 5 {
			errorClass = "error"
		}
		
		rows.WriteString(fmt.Sprintf(`
			<tr>
				<td>%s</td>
				<td>%d</td>
				<td>%.0fms</td>
				<td class="%s">%.1f%%</td>
			</tr>`, stat.Model, stat.Count, stat.AvgDuration, errorClass, stat.ErrorRate))
	}
	return rows.String()
}

func generateFeedbackTableRows(feedbacks []FeedbackEvent) string {
	if len(feedbacks) == 0 {
		return `<tr><td colspan="3" style="text-align: center; color: #666;">No feedback submitted yet</td></tr>`
	}
	
	var rows strings.Builder
	for _, f := range feedbacks {
		var emailCell string
		if f.Email == "" {
			emailCell = "<em style='color: #999;'>Not provided</em>"
		} else {
			emailCell = html.EscapeString(f.Email)
		}
		
		rows.WriteString(fmt.Sprintf(`
			<tr class="event-row">
				<td style="white-space: nowrap;">%s</td>
				<td>%s</td>
				<td><div class="feedback-message">%s</div></td>
			</tr>`, html.EscapeString(f.Timestamp), emailCell, html.EscapeString(f.Message)))
	}
	return rows.String()
}
