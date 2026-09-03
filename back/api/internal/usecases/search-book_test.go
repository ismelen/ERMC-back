package usecases

import (
	"errors"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ismelen/inkomi/internal/domain/book"
	"ismelen/inkomi/internal/test/mocks"
)

func newSearchUC(hasMirror bool, books []book.Book, searchErr error) (*SearchBookUC, *mocks.BooksProviderMock) {
	src := mocks.NewBooksSourceMock("http://test.example")
	src.SearchResult = books
	src.SearchErr = searchErr

	prov := &mocks.BooksProviderMock{
		Source:    src,
		HasMirror: hasMirror,
	}
	return NewSearchBookUC(prov), prov
}

func TestSearchBookUC_NoMirror_ReturnsError(t *testing.T) {
	t.Parallel()
	uc, _ := newSearchUC(false, nil, nil)

	_, err := uc.Execute("golang", "English", []string{"epub"})
	require.Error(t, err)
	assert.Contains(t, strings.ToLower(err.Error()), "mirror")
}

func TestSearchBookUC_FiltersByLanguage(t *testing.T) {
	t.Parallel()
	books := []book.Book{
		{Title: "Go Programming", Language: "English", Extension: "epub", MD5: "aaa111"},
		{Title: "Programacion Go", Language: "Spanish", Extension: "epub", MD5: "bbb222"},
	}
	uc, _ := newSearchUC(true, books, nil)

	result, err := uc.Execute("go", "English", []string{"epub"})
	require.NoError(t, err)
	require.Len(t, result, 1)
	assert.Equal(t, "English", result[0].Language)
}

func TestSearchBookUC_FiltersByFormat(t *testing.T) {
	t.Parallel()
	books := []book.Book{
		{Title: "Go Programming", Language: "English", Extension: "epub", MD5: "aaa111"},
		{Title: "Go Reference", Language: "English", Extension: "pdf", MD5: "bbb222"},
	}
	uc, _ := newSearchUC(true, books, nil)

	result, err := uc.Execute("go", "English", []string{"epub"})
	require.NoError(t, err)
	require.Len(t, result, 1)
	assert.Equal(t, "epub", result[0].Extension)
}

func TestSearchBookUC_Deduplicates(t *testing.T) {
	t.Parallel()
	// Two books with the same title (after normalization) and same MD5 should collapse to one.
	books := []book.Book{
		{Title: "Go Programming", Language: "English", Extension: "epub", MD5: "aaa111"},
		{Title: "Go Programming", Language: "English", Extension: "epub", MD5: "aaa111"},
	}
	uc, _ := newSearchUC(true, books, nil)

	result, err := uc.Execute("go", "English", []string{"epub"})
	require.NoError(t, err)
	assert.Len(t, result, 1)
}

func TestSearchBookUC_MirrorError_Propagated(t *testing.T) {
	t.Parallel()
	searchErr := errors.New("mirror down")
	uc, _ := newSearchUC(true, nil, searchErr)

	_, err := uc.Execute("go", "", []string{"epub"})
	require.ErrorIs(t, err, searchErr)
}

func TestSearchBookUC_EmptyLanguage_ReturnsAll(t *testing.T) {
	t.Parallel()
	books := []book.Book{
		{Title: "Go Programming", Language: "English", Extension: "epub", MD5: "aaa111"},
		{Title: "Programacion Go", Language: "Spanish", Extension: "pdf", MD5: "bbb222"},
	}
	uc, _ := newSearchUC(true, books, nil)

	// language="" -> LanguageFilter passes through; formats=["epub","pdf"] -> both pass
	result, err := uc.Execute("go", "", []string{"epub", "pdf"})
	require.NoError(t, err)
	assert.Len(t, result, 2)
}
