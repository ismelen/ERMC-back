package mocks

import (
	"ismelen/inkomi/internal/domain/book"
)

type BooksProviderMock struct {
	Source        *BooksSourceMock
	HasMirror     bool
	RefreshResult bool
	RefreshCalled bool
}

func (s *BooksProviderMock) GetMirror() (book.BooksSource, bool) {
	if !s.HasMirror {
		return nil, false
	}
	return s.Source, true
}

func (s *BooksProviderMock) Refresh() bool {
	s.RefreshCalled = true
	s.HasMirror = s.RefreshResult
	return s.RefreshResult
}
