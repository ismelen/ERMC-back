package mocks

import (
	"context"
	"ismelen/inkomi/internal/domain/book"
	"time"
)

type BookSourceDiscovererMock struct {
	OnUpdate func(book.BooksSource)
	Source   book.BooksSource
}

func (m *BookSourceDiscovererMock) Start(ctx context.Context, interval time.Duration) {}

func (m *BookSourceDiscovererMock) UpdateSource() book.BooksSource {
	return m.Source
}

func (m *BookSourceDiscovererMock) SetOnUpdate(onUpdate func(book.BooksSource)) {
	m.OnUpdate = onUpdate
}
