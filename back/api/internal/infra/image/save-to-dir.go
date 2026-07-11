package image

import (
	"github.com/disintegration/imaging"
)

func (ip *ImageEditor) SaveToDir(path string) (string, error) {
	path += ".jpg"
	err := imaging.Save(*(ip.Img), path, imaging.JPEGQuality(85))
	if err != nil {
		return "", err
	}
	return path, nil
}
