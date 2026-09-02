package manga

import "ismelen/inkomi/internal/domain/convert"

// ImageProcessor is the port implemented by infra/image to process a raw page file
// into a domain Page ready for the epub builder.
type ImageProcessor interface {
	ProcessPage(path string, idx int, profile *convert.EReaderProfile, settings *ImageSettings) (*Page, error)
}
