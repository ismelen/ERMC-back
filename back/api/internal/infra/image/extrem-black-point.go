package image

import (
	"image/color"
	"log"
	"math"

	"github.com/disintegration/imaging"
)

func (e *ImageEditor) SetExtremeBlackPoint() {
	// (*e.Img) = imaging.AdjustContrast(*e.Img, 20)
	log.Println("Applying extreme black point")
	bp := e.findExtremeBlackPoint(64)
	if bp == 0 {
		return
	}

	bpf := float64(bp)

	*e.Img = imaging.AdjustFunc(*e.Img, func(c color.NRGBA) color.NRGBA {
		return color.NRGBA{
			R: adjustChannel(c.R, bpf),
			G: adjustChannel(c.G, bpf),
			B: adjustChannel(c.B, bpf),
			A: c.A,
		}
	})
}

func adjustChannel(v uint8, blackPoint float64) uint8 {
	f := float64(v)

	if f < blackPoint {
		f = blackPoint
	}

	if blackPoint >= 255 {
		return 255
	}

	scaled := (f - blackPoint) / (255.0 - blackPoint) * 255.0
	scaled = math.Min(math.Max(scaled, 0), 255)
	return uint8(scaled + 0.5)
}

func (e *ImageEditor) findExtremeBlackPoint(darkZoneMax int) int {
	img := *(e.Img)

	histogram := make([]int, 256)
	bounds := img.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := img.At(x, y).RGBA()
			lum := uint8((0.299*float64(r>>8) + 0.587*float64(g>>8) + 0.114*float64(b>>8)) + 0.5)
			histogram[lum]++
		}
	}

	maxCount := 0
	blackPoint := 0
	for i := 0; i < darkZoneMax && i < 256; i++ {
		if histogram[i] > maxCount {
			maxCount = histogram[i]
			blackPoint = i
		}
	}
	return blackPoint
}
