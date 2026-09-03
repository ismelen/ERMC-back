package usecases_test

import (
	"image"
	"image/color"
	"image/jpeg"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/domain/manga"
	"ismelen/inkomi/internal/usecases"
	"os"
	"path/filepath"
	"testing"
)

func createTestImage(path string, width, height int) error {
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{R: 255, G: 255, B: 255, A: 255})
		}
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return jpeg.Encode(f, img, nil)
}

func TestProcessPage_Split(t *testing.T) {
	tempDir := t.TempDir()

	uc := usecases.MangaTransactionUC{}

	profile := &convert.EReaderProfile{
		Width:  800,
		Height: 1200,
	}

	tests := []struct {
		name          string
		settings      *manga.ImageSettings
		expectedParts int
		expectedOrder []manga.SplitOperation
	}{
		{
			name: "Split LeftToRight (SpreadSplitter=0, RightToLeft=false)",
			settings: &manga.ImageSettings{
				SpreadSplitter: 0,
				RightToLeft:    false,
			},
			expectedParts: 2,
			expectedOrder: []manga.SplitOperation{manga.SplitToLeft, manga.SplitToRight},
		},
		{
			name: "Split RightToLeft (SpreadSplitter=0, RightToLeft=true)",
			settings: &manga.ImageSettings{
				SpreadSplitter: 0,
				RightToLeft:    true,
			},
			expectedParts: 2,
			expectedOrder: []manga.SplitOperation{manga.SplitToRight, manga.SplitToLeft},
		},
		{
			name: "Split+Rotated (SpreadSplitter=1, RightToLeft=false)",
			settings: &manga.ImageSettings{
				SpreadSplitter: 1,
				RightToLeft:    false,
			},
			expectedParts: 3,
			expectedOrder: []manga.SplitOperation{manga.SplitToLeft, manga.SplitToRight, manga.SplitRotated},
		},
		{
			name: "Split+Rotated RightToLeft (SpreadSplitter=1, RightToLeft=true)",
			settings: &manga.ImageSettings{
				SpreadSplitter: 1,
				RightToLeft:    true,
			},
			expectedParts: 3,
			expectedOrder: []manga.SplitOperation{manga.SplitToRight, manga.SplitToLeft, manga.SplitRotated},
		},
		{
			name: "Rotated (SpreadSplitter=2)",
			settings: &manga.ImageSettings{
				SpreadSplitter: 2,
				RightToLeft:    false,
			},
			expectedParts: 1,
			expectedOrder: []manga.SplitOperation{manga.SplitRotated},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			path := filepath.Join(tempDir, "wide_"+tc.name+".jpg")
			createTestImage(path, 1600, 1200)

			page, err := uc.ProcessPage(path, 1, profile, tc.settings)
			if err != nil {
				t.Fatalf("ProcessPage failed: %v", err)
			}

			if len(page.Parts) != tc.expectedParts {
				t.Fatalf("Expected %d parts, got %d", tc.expectedParts, len(page.Parts))
			}

			for i, exp := range tc.expectedOrder {
				if page.Parts[i].Split != exp {
					t.Errorf("Part %d: expected SplitOperation %v, got %v", i, exp, page.Parts[i].Split)
				}
			}
		})
	}
}
