package book

import (
	"context"
	"time"
)

type BookSourceDiscoverer interface {
	Start(ctx context.Context, interval time.Duration)
	UpdateSource() BooksSource
	SetOnUpdate(onUpdate func(BooksSource))
}
