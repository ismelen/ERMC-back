package fs

import (
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"ismelen/inkomi/internal/shared/fsutil"
	"os"
	"path/filepath"
	"sort"
	"strings"

	nativewebp "github.com/HugoSmits86/nativewebp"
	"github.com/pdfcpu/pdfcpu/pkg/api"
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

	fPdf, err := os.Open(file)
	if err != nil {
		return "", "", nil, err
	}
	defer fPdf.Close()

	// Extract images directly from PDF streams
	images, err := api.ExtractImagesRaw(fPdf, nil, nil)
	if err != nil {
		return "", "", nil, err
	}

	paths := make([]string, 0)
	pageCounter := 0

	for _, pageImages := range images {
		if len(pageImages) == 0 {
			continue
		}

		// Sort images by object number to ensure consistent order if there are multiple
		objNrs := make([]int, 0, len(pageImages))
		for objNr := range pageImages {
			objNrs = append(objNrs, objNr)
		}
		sort.Ints(objNrs)

		for _, objNr := range objNrs {
			imgObj := pageImages[objNr]
			pageCounter++

			// Decode the extracted image stream
			img, _, err := image.Decode(imgObj)
			if err != nil {
				// If image format is unsupported, skip or return error.
				// We return an error for now.
				return "", "", nil, fmt.Errorf("UnzipPdf: error decoding image %d: %w", pageCounter, err)
			}

			// Ensure reader is closed if it implements io.ReadCloser (model.Image embeds io.Reader)
			if rc, ok := imgObj.Reader.(io.ReadCloser); ok {
				rc.Close()
			}

			pagePath := filepath.Join(folderPath, fmt.Sprintf("page%03d.webp", pageCounter))
			f, err := os.Create(pagePath)
			if err != nil {
				return "", "", nil, err
			}

			opts := &nativewebp.Options{CompressionLevel: nativewebp.DefaultCompression}
			if err := nativewebp.Encode(f, img, opts); err != nil {
				f.Close()
				return "", "", nil, fmt.Errorf("UnzipPdf: error encoding page %d: %w", pageCounter, err)
			}
			f.Close()

			paths = append(paths, pagePath)
		}
	}

	return fileName, folderPath, paths, nil
}
