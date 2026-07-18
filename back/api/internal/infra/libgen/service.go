package libgen

import (
	"fmt"
	"ismelen/inkomi/internal/domain/book"
	bookfilters "ismelen/inkomi/internal/domain/book/filters"
	"ismelen/inkomi/internal/shared/filter"
	"sync/atomic"

	"golang.org/x/sync/singleflight"
)

type LibgenService struct {
	mirror        atomic.Value
	singleUpdater singleflight.Group
}

func New() *LibgenService {
	return &LibgenService{}
}

func (l *LibgenService) Search(query string, language string, formats []string) ([]book.Book, error) {
	mirror, ok := l.getMirror()
	if !ok {
		return nil, fmt.Errorf("no mirror available yet")
	}

	books, err := mirror.Search(query)
	if err != nil {
		return nil, err
	}

	filterChain := filter.Use(
		&bookfilters.LanguageFilter{Language: language},
		&bookfilters.FormatFilter{Formats: formats},
		&bookfilters.DeduplicateFilter{},
	)

	_, filteredBooks := filterChain.Filter(books)
	return filteredBooks, nil
}

func (l *LibgenService) Download(md5 string, retries int) (*book.LibgenDownload, error) {
	if retries <= 0 {
		return nil, fmt.Errorf("download failed after %d retries, no working mirror", retries)
	}

	mirror, ok := l.getMirror()
	if !ok {
		return nil, fmt.Errorf("no mirror available yet")
	}

	resp, err := mirror.Download(md5)
	if err != nil {
		l.refreshMirror()
		return l.Download(md5, retries-1)
	}

	return resp, nil
}
