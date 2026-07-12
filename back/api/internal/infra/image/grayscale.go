package image

import (
	"github.com/disintegration/imaging"
)

func (ip *ImageEditor) Grayscale() {
	(*ip.Img) = imaging.Grayscale(*ip.Img)
	(*ip.Img) = imaging.AdjustContrast(*ip.Img, 25)
}
