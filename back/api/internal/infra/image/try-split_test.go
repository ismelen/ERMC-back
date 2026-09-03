package image_test

import (
	"image"
	"image/color"
	"image/jpeg"
	"ismelen/inkomi/internal/domain/manga"
	infra_image "ismelen/inkomi/internal/infra/image"
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

func TestImageEditor_TrySplit_Normal_ShouldSplit(t *testing.T) {
	t.Parallel()
	tempDir := t.TempDir()

	// Test 1: No split if image orientation matches target orientation
	t.Run("NoSplit_MatchingOrientation", func(t *testing.T) {
		t.Parallel()
		// Arrange
		path := filepath.Join(tempDir, "tall.jpg")
		createTestImage(path, 800, 1200)
		editor, err := infra_image.NewEditor(path, 600, 800, false)
		if err != nil {
			t.Fatal(err)
		}

		// Act
		res := editor.TrySplit(false)

		// Assert
		if len(res) != 1 {
			t.Fatalf("Expected 1 part, got %d", len(res))
		}
		if res[0].SplitOperation != manga.SplitNone {
			t.Errorf("Expected SplitNone, got %v", res[0].SplitOperation)
		}
	})

	// Test 2: Rotated split when it fits target
	t.Run("Rotated_FitsTarget", func(t *testing.T) {
		t.Parallel()
		// Arrange
		path := filepath.Join(tempDir, "wide_fits.jpg")
		// Width 1200, height 800. Target is 800x1200.
		// rotated means w <= targetH (1200 <= 1200) and h <= targetW (800 <= 800)
		createTestImage(path, 1200, 800)
		editor, err := infra_image.NewEditor(path, 800, 1200, false)
		if err != nil {
			t.Fatal(err)
		}

		// Act
		res := editor.TrySplit(true)

		// Assert
		if len(res) != 1 {
			t.Fatalf("Expected 1 part, got %d", len(res))
		}
		if res[0].SplitOperation != manga.SplitRotated {
			t.Errorf("Expected SplitRotated, got %v", res[0].SplitOperation)
		}
	})

	// Test 3: Normal Split
	t.Run("NormalSplit", func(t *testing.T) {
		t.Parallel()
		// Arrange
		path := filepath.Join(tempDir, "wide_split.jpg")
		createTestImage(path, 1600, 1200) // target is 800x1200
		editor, err := infra_image.NewEditor(path, 800, 1200, false)
		if err != nil {
			t.Fatal(err)
		}

		// Act
		res := editor.TrySplit(false)

		// Assert
		if len(res) != 3 {
			t.Fatalf("Expected 3 parts, got %d", len(res))
		}

		if res[0].SplitOperation != manga.SplitToLeft {
			t.Errorf("Expected first part to be SplitToLeft, got %v", res[0].SplitOperation)
		}
		if res[1].SplitOperation != manga.SplitToRight {
			t.Errorf("Expected second part to be SplitToRight, got %v", res[1].SplitOperation)
		}
		if res[2].SplitOperation != manga.SplitRotated {
			t.Errorf("Expected third part to be SplitRotated, got %v", res[2].SplitOperation)
		}
	})
}
