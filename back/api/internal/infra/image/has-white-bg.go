package image

func (ip *ImageEditor) HasWhiteBg() bool {
	// bwImg := imaging.Grayscale(*ip.Img)
	// whiteBox := ip.GetBBox(bwImg, true)
	// blackBox := ip.GetBBox(bwImg, false)

	// whiteSurface := whiteBox.getSurface()
	// blackSurface := blackBox.getSurface()

	// hasWhiteBg := blackSurface < whiteSurface
	// ip.hasWhiteBg = hasWhiteBg

	// return hasWhiteBg
	return true
}
