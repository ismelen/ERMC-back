package epub_test

import (
	"archive/zip"
	"io"
	"path/filepath"
	"strings"
	"testing"

	"github.com/bitfield/checkepub"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/infra/epub"
)

func makeResultFile(path string) *convert.TransactionResultFile {
	filename := filepath.Base(path)
	return convert.NewTransactionResultFile("test-id", filename, path, 0, nil)
}

func TestMergeEpubs_WithNoEpubsToMerge_ShouldThrowError(t *testing.T) {
	t.Parallel()

	// Arrange
	outPath := filepath.Join(t.TempDir(), "merged.epub")

	// Act
	merger := epub.NewEpubMerger()
	errNil := merger.Merge(nil, "title", "author", outPath)
	errEmpty := merger.Merge([]*convert.TransactionResultFile{}, "title", "author", outPath)

	// Assert
	assert.Error(t, errNil, "expected non-nil error for nil paths slice, got nil")
	assert.Error(t, errEmpty, "expected non-nil error for empty paths slice, got nil")
}

func TestMergeEpubs_SingleFile_ValidOutput(t *testing.T) {
	t.Parallel()

	// Arrange
	src := buildFakeEpub(t, "single-source", 1, true)
	outPath := filepath.Join(t.TempDir(), "merged.epub")

	// Act
	merger := epub.NewEpubMerger()
	err := merger.Merge([]*convert.TransactionResultFile{makeResultFile(src)}, "My Manga", "Author", outPath)

	// Assert
	require.NoError(t, err, "Merge")
	result, err := checkepub.Check(outPath)

	assert.NoError(t, err)
	assert.Equal(t, result.Status, checkepub.StatusValid)
	assert.Len(t, result.Errors, 0)
}

func TestMergeEpubs_WithTwoFiles_SpineHasTwoEntries(t *testing.T) {
	t.Parallel()

	// Arrange
	src1 := buildFakeEpub(t, "source-1", 1, true)
	src2 := buildFakeEpub(t, "source-2", 1, true)
	outPath := filepath.Join(t.TempDir(), "merged2.epub")

	paths := []*convert.TransactionResultFile{
		makeResultFile(src1),
		makeResultFile(src2),
	}

	// Act
	merger := epub.NewEpubMerger()
	err := merger.Merge(paths, "Combined", "Author", outPath)

	// Assert
	require.NoError(t, err, "Merge")

	zr, err := zip.OpenReader(outPath)
	require.NoError(t, err, "zip.OpenReader")
	defer zr.Close()

	var opfContent string
	for _, f := range zr.File {
		if f.Name == "OEBPS/content.opf" {
			rc, err := f.Open()
			require.NoError(t, err, "open content.opf")
			data, err := io.ReadAll(rc)
			rc.Close()
			require.NoError(t, err, "read content.opf")
			opfContent = string(data)
			break
		}
	}
	require.NotEmpty(t, opfContent, "OEBPS/content.opf not found in merged epub")

	spineStart := strings.Index(opfContent, "<spine")
	require.NotEqual(t, -1, spineStart, "<spine> section not found in content.opf")

	spineEnd := strings.Index(opfContent, "</spine>")
	require.NotEqual(t, -1, spineEnd, "</spine> section not found in content.opf")

	spineSection := opfContent[spineStart:spineEnd]
	count := strings.Count(spineSection, "<itemref")
	assert.GreaterOrEqual(t, count, 2, "expected at least 2 <itemref> in <spine>\nspine section:\n%s", spineSection)
}
