package testutil

import (
	"ismelen/inkomi/internal/domain/book"
	"sync"
)

// BooksSourceMock is a test double for book.BooksSource.
type BooksSourceMock struct {
	URL            string
	SearchResult   []book.Book
	SearchErr      error
	DownloadResult *book.LibgenDownload
	DownloadErr    error
	mu             sync.Mutex
	failsLeft      int
}

// NewBooksSourceMock creates a stub source with the given URL.
func NewBooksSourceMock(url string) *BooksSourceMock {
	return &BooksSourceMock{URL: url}
}

// WithDownloadFailN configures the stub to fail the next n Download calls.
func (s *BooksSourceMock) WithDownloadFailN(n int) *BooksSourceMock {
	s.mu.Lock()
	s.failsLeft = n
	s.mu.Unlock()
	return s
}

// Search returns the preconfigured SearchResult / SearchErr.
func (s *BooksSourceMock) Search(_ string) ([]book.Book, error) {
	return s.SearchResult, s.SearchErr
}

// Download returns DownloadErr for the first failsLeft calls, then DownloadResult/nil.
func (s *BooksSourceMock) Download(_ string) (*book.LibgenDownload, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failsLeft > 0 {
		s.failsLeft--
		return nil, s.DownloadErr
	}
	return s.DownloadResult, nil
}

// GetURL returns the configured URL.
func (s *BooksSourceMock) GetURL() string { return s.URL }

// BooksProviderMock is a test double for book.BooksProvider.
type BooksProviderMock struct {
	Source        *BooksSourceMock
	HasMirror     bool
	RefreshResult bool
	RefreshCalled bool
}

// GetMirror returns (Source, HasMirror).
func (s *BooksProviderMock) GetMirror() (book.BooksSource, bool) {
	if !s.HasMirror {
		return nil, false
	}
	return s.Source, true
}

// Refresh records the call and returns RefreshResult.
func (s *BooksProviderMock) Refresh() bool {
	s.RefreshCalled = true
	s.HasMirror = s.RefreshResult
	return s.RefreshResult
}
