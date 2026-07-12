package image

import (
	"image"

	"github.com/disintegration/imaging"
)

func (ip *ImageEditor) CropMargins() {
	img := *ip.Img

	box, bg := ip.GetBBox(img)
	rect := image.Rect(box[0], box[1], box[2], box[3])

	(*ip.Img) = imaging.Crop(*ip.Img, rect)
	ip.bg = [3]uint8{bg.R, bg.G, bg.B}
}
