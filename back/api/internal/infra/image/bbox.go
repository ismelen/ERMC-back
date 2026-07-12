package image

import (
	"image"
	"image/color"
	"log"
	"math"
)

type bBox = [4]int // left, top, right, bottom

func (e *ImageEditor) GetBBox(img image.Image) (bBox, color.RGBA) {
	dims := img.Bounds()
	w, h := dims.Dx()-1, dims.Dy()-1
	max := int(math.Min(0.1*float64(w), 0.1*float64(h)))
	colors := make(map[color.RGBA]int)

	sides := [4]side{
		{origin: [2]int{0, 0}, vector: [2]int{1, 0}, dim: [2]int{0, h}},
		{origin: [2]int{0, 0}, vector: [2]int{0, 1}, dim: [2]int{w, 0}},
		{origin: [2]int{w, 0}, vector: [2]int{-1, 0}, dim: [2]int{0, h}},
		{origin: [2]int{0, h}, vector: [2]int{0, -1}, dim: [2]int{w, 5}},
	}

	var bBox bBox
	for i, side := range sides {
		margin, bg := side.crop(img, max, 0.05)
		bBox[i] = margin
		colors[bg]++
	}

	var bg color.RGBA
	bgCant := 0
	for c, cant := range colors {
		if cant > bgCant {
			bgCant = cant
			bg = c
		}
	}

	return bBox, bg
}

type side struct {
	vector [2]int
	origin [2]int
	dim    [2]int
}

func (s side) crop(img image.Image, max int, nonBgThreshold float64) (int, color.RGBA) {
	var bgColor *color.RGBA

	lvl := 0
	for ; lvl < max; lvl++ {
		x := s.origin[0] + (lvl+s.dim[0])*s.vector[0]
		y := s.origin[1] + (lvl+s.dim[1])*s.vector[1]

		colors := make(map[color.RGBA]int)
		total := 0

		for bx := x; bx <= x+s.dim[0]; bx++ {
			for by := y; by <= y+s.dim[1]; by++ {
				pixel := img.At(bx, by)
				c := color.NRGBAModel.Convert(pixel).(color.NRGBA)
				color := color.RGBA{c.R, c.G, c.B, 255}

				colors[color]++
				total++
			}
		}

		var bg color.RGBA
		bgCant := 0
		for c, cant := range colors {
			if cant > bgCant {
				bgCant = cant
				bg = c
			}
		}

		if bgColor == nil {
			bgColor = &bg
		} else if *bgColor != bg {
			break
		}

		nonBgRatio := 1.0 - float64(bgCant)/float64(total)
		if nonBgRatio > nonBgThreshold {
			if s.dim[1] > 1 {
				log.Println(lvl, nonBgRatio)
			}
			break
		}
	}

	delta := s.vector[0] + s.vector[1]
	origin := int(math.Max(float64(s.origin[0]), float64(s.origin[1])))

	if lvl-1 < 0 {
		return origin, *bgColor
	}
	return origin + delta*lvl, *bgColor
}
