package fs

import (
	"fmt"
	"ismelen/inkomi/internal/shared/fsutil"
	"os"
	"path/filepath"
	"strings"

	nativewebp "github.com/HugoSmits86/nativewebp"
	"github.com/gen2brain/go-fitz"
)

func UnzipPdf(file string, dstPath string) (string, string, []string, error) {
	name := filepath.Base(file)
	fileName := strings.TrimSuffix(name, filepath.Ext(name))

	sanitizedFilename, err := fsutil.SanitizeFilename(fileName)
	if err != nil {
		return "", "", nil, err
	}

	folderPath := filepath.Join(dstPath, sanitizedFilename)
	if err := os.MkdirAll(folderPath, os.ModePerm); err != nil {
		return "", "", nil, err
	}

	doc, err := fitz.New(file)
	if err != nil {
		return "", "", nil, err
	}
	defer doc.Close()

	numPages := doc.NumPage()
	paths := make([]string, 0, numPages)

	for n := 0; n < numPages; n++ {
		img, err := doc.Image(n)
		if err != nil {
			return "", "", nil, fmt.Errorf("UnzipPdf: error rendering page %d: %w", n, err)
		}

		pagePath := filepath.Join(folderPath, fmt.Sprintf("page%03d.webp", n+1))
		f, err := os.Create(pagePath)
		if err != nil {
			return "", "", nil, err
		}

		opts := &nativewebp.Options{CompressionLevel: nativewebp.DefaultCompression}
		if err := nativewebp.Encode(f, img, opts); err != nil {
			f.Close()
			return "", "", nil, fmt.Errorf("UnzipPdf: error encoding page %d: %w", n, err)
		}
		f.Close()

		paths = append(paths, pagePath)
	}

	return fileName, folderPath, paths, nil
}
