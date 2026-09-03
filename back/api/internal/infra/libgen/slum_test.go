package libgen

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSlum_GetMirrors_Fallback_ShouldReturnFallback(t *testing.T) {
	// Start a server that returns a 500 error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	originalURL := slumURL
	slumURL = server.URL
	defer func() { slumURL = originalURL }()

	mirrors := getMirrors()

	if len(mirrors) != len(fallbackMirrors) {
		t.Errorf("Expected fallback mirrors to be used, got length %d", len(mirrors))
	}
}

func TestSlum_GetMirrors_Success_ShouldReturnMirrors(t *testing.T) {
	responseBody := slumResponse{}

	// Add some valid groups
	responseBody.PublicGroupList = append(responseBody.PublicGroupList, struct {
		Name        string `json:"name"`
		MonitorList []struct {
			Name    string `json:"name"`
			URL     string `json:"url"`
			SendURL int    `json:"sendUrl"`
		} `json:"monitorList"`
	}{
		Name: "Library Genesis",
		MonitorList: []struct {
			Name    string `json:"name"`
			URL     string `json:"url"`
			SendURL int    `json:"sendUrl"`
		}{
			{Name: "Classic", URL: "http://libgen.is/", SendURL: 1},
			{Name: "Plus +", URL: "http://libgen.la/", SendURL: 1},
			{Name: "Invalid", URL: "", SendURL: 1},
			{Name: "NoSend", URL: "http://libgen.ns/", SendURL: 0},
		},
	})

	// Add an invalid group
	responseBody.PublicGroupList = append(responseBody.PublicGroupList, struct {
		Name        string `json:"name"`
		MonitorList []struct {
			Name    string `json:"name"`
			URL     string `json:"url"`
			SendURL int    `json:"sendUrl"`
		} `json:"monitorList"`
	}{
		Name: "Other",
		MonitorList: []struct {
			Name    string `json:"name"`
			URL     string `json:"url"`
			SendURL int    `json:"sendUrl"`
		}{
			{Name: "Other", URL: "http://other.com/", SendURL: 1},
		},
	})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(responseBody)
	}))
	defer server.Close()

	originalURL := slumURL
	slumURL = server.URL
	defer func() { slumURL = originalURL }()

	mirrors := getMirrors()

	if len(mirrors) != 2 {
		t.Fatalf("Expected 2 mirrors, got %d", len(mirrors))
	}

	if mirrors[0].GetURL() != "http://libgen.is" {
		t.Errorf("Expected first mirror to be http://libgen.is, got %s", mirrors[0].GetURL())
	}

	if mirrors[1].GetURL() != "http://libgen.la" {
		t.Errorf("Expected second mirror to be http://libgen.la, got %s", mirrors[1].GetURL())
	}
}
