package requtil

import (
	"mime/multipart"
	"net/http"
)

func GetFormFile(r *http.Request) (multipart.File, *multipart.FileHeader, error) {
	if err := r.ParseMultipartForm(200 << 20); err != nil {
		return nil, nil, err
	}

	return r.FormFile("file")
}
