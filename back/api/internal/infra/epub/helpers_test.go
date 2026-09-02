package epub_test

import (
	"archive/zip"
	"fmt"
	"image"
	"image/color"
	"io"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/domain/manga"
	"ismelen/inkomi/internal/infra/epub"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func buildFakeEpub(t *testing.T, name string, numPages int, rtl bool) string {
	t.Helper()

	tmpDir := t.TempDir()
	settings := manga.NewDefaultImageSettings()
	settings.RightToLeft = rtl
	profile, _ := convert.NewProfile("koCC")

	builder := epub.NewEpubBuilder().SetSettings(settings, profile).Start(name, tmpDir)

	for i, page := range getFakePages(t, tmpDir, numPages) {
		builder.AddPage(page, i == 0)
	}

	path, err := builder.Build()
	require.NoError(t, err, "Build")
	return path
}

func getFakePages(t *testing.T, tmpDir string, numPages int) []*manga.Page {
	t.Helper()

	chaptersDir := filepath.Join(tmpDir, "chapters")
	err := os.MkdirAll(chaptersDir, os.ModeAppend)
	require.NoError(t, err, "mkdir chapters dir")

	pages := make([]*manga.Page, 0, numPages)
	for i := range numPages {
		imgPath := filepath.Join(chaptersDir, fmt.Sprintf("page%04.jpg", i+1))
		err := os.WriteFile(imgPath, []byte("FAKEJPEG"), os.ModePerm)
		require.NoError(t, err)

		nrgbaImg := image.NewNRGBA(image.Rect(0, 0, 1, 1))
		nrgbaImg.Set(0, 0, color.White)
		var img image.Image = nrgbaImg

		part := manga.NewPagePart(&img, manga.SplitNone)
		part.SetPath(imgPath)

		page := manga.NewPage(imgPath)
		page.Parts = append(page.Parts, part)
		pages = append(pages, page)
	}

	return pages
}

func openFakeZip(t *testing.T, path string) *zip.ReadCloser {
	t.Helper()

	zr, err := zip.OpenReader(path)
	require.NoError(t, err)

	t.Cleanup(func() { zr.Close() })
	return zr
}

func getFakeZipEntry(zr *zip.ReadCloser, path string) *zip.File {
	for _, f := range zr.File {
		if f.Name == path {
			return f
		}
	}

	return nil
}

func getFakeZipEntryContent(t *testing.T, zr *zip.ReadCloser, name string) string {
	t.Helper()

	f := getFakeZipEntry(zr, name)
	require.NotNil(t, f)

	rc, err := f.Open()
	defer rc.Close()

	data, err := io.ReadAll(rc)
	require.NoError(t, err)

	return string(data)
}
