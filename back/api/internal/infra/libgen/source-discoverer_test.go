package libgen

import (
	"context"
	"ismelen/inkomi/internal/domain/book"
	"ismelen/inkomi/internal/test/mocks"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestSourceDiscoverer_UpdateSource_Normal_ShouldReturnFastest(t *testing.T) {
	// Create two test servers, one fast and one slow
	fastServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer fastServer.Close()

	slowServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer slowServer.Close()

	brokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer brokenServer.Close()

	// Mock getMirrors
	originalGetMirrors := getMirrors
	getMirrors = func() []book.BooksSource {
		return []book.BooksSource{
			&mocks.BooksSourceMock{URL: brokenServer.URL},
			&mocks.BooksSourceMock{URL: slowServer.URL},
			&mocks.BooksSourceMock{URL: fastServer.URL},
		}
	}
	defer func() { getMirrors = originalGetMirrors }()

	discoverer := NewSourceDiscoverer()

	source := discoverer.UpdateSource()
	if source == nil {
		t.Fatal("Expected to find a source, got nil")
	}

	if source.GetURL() != fastServer.URL {
		t.Errorf("Expected fastest server URL %s, got %s", fastServer.URL, source.GetURL())
	}
}

func TestSourceDiscoverer_UpdateSource_NoValidMirrors_ShouldReturnNil(t *testing.T) {
	brokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer brokenServer.Close()

	// Mock getMirrors
	originalGetMirrors := getMirrors
	getMirrors = func() []book.BooksSource {
		return []book.BooksSource{
			&mocks.BooksSourceMock{URL: brokenServer.URL},
		}
	}
	defer func() { getMirrors = originalGetMirrors }()

	discoverer := NewSourceDiscoverer()

	source := discoverer.UpdateSource()
	if source != nil {
		t.Errorf("Expected nil source when all mirrors fail, got %v", source)
	}
}

func TestSourceDiscoverer_Start_Normal_ShouldCallOnUpdate(t *testing.T) {
	fastServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer fastServer.Close()

	originalGetMirrors := getMirrors
	getMirrors = func() []book.BooksSource {
		return []book.BooksSource{
			&mocks.BooksSourceMock{URL: fastServer.URL},
		}
	}
	defer func() { getMirrors = originalGetMirrors }()

	discoverer := NewSourceDiscoverer()

	called := make(chan bool, 1)
	discoverer.SetOnUpdate(func(source book.BooksSource) {
		called <- true
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	discoverer.Start(ctx, 100*time.Millisecond)

	select {
	case <-called:
		// Success
	case <-time.After(1 * time.Second):
		t.Error("onUpdate was not called")
	}
}
