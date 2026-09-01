package usecases

import (
	"fmt"
	"ismelen/inkomi/internal/domain/book"
	booksFilter "ismelen/inkomi/internal/domain/book/filters"
	"ismelen/inkomi/internal/shared/filter"
)

type SearchBookUC struct {
	provider book.BooksProvider
}

func NewSearchBookUC(provider book.BooksProvider) *SearchBookUC {
	return &SearchBookUC{
		provider: provider,
	}
}

func (s *SearchBookUC) Execute(query string, language string, formats []string) ([]book.Book, error) {
	mirror, ok := s.provider.GetMirror()
	if !ok {
		return nil, fmt.Errorf("no mirror available yet")
	}

	books, err := mirror.Search(query)
	if err != nil {
		return nil, err
	}

	filterChain := filter.Use(
		&booksFilter.LanguageFilter{Language: language},
		&booksFilter.FormatFilter{Formats: formats},
		&booksFilter.DeduplicateFilter{},
	)

	_, filteredBooks := filterChain.Filter(books)
	return filteredBooks, nil
}
