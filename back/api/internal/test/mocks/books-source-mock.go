package mocks

import (
	"ismelen/inkomi/internal/domain/book"
	"sync"
)

type BooksSourceMock struct {
	URL            string
	SearchResult   []book.Book
	SearchErr      error
	DownloadResult *book.LibgenDownload
	DownloadErr    error
	mu             sync.Mutex
	failsLeft      int
}

func NewBooksSourceMock(url string) *BooksSourceMock {
	return &BooksSourceMock{URL: url}
}

func (s *BooksSourceMock) WithDownloadFailN(n int) *BooksSourceMock {
	s.mu.Lock()
	s.failsLeft = n
	s.mu.Unlock()
	return s
}

func (s *BooksSourceMock) Search(_ string) ([]book.Book, error) {
	return s.SearchResult, s.SearchErr
}

func (s *BooksSourceMock) Download(_ string) (*book.LibgenDownload, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failsLeft > 0 {
		s.failsLeft--
		return nil, s.DownloadErr
	}
	return s.DownloadResult, nil
}

func (s *BooksSourceMock) GetURL() string { return s.URL }
