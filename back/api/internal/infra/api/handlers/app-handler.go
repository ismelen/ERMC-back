package handlers

import (
	"bufio"
	"fmt"
	"ismelen/inkomi/internal/infra/api/requtil"
	"net/http"
	"os"
)

type AppHandler struct{}

func NewAppHandler() (_ *AppHandler) { return }

func (a *AppHandler) HandleVersion(r *http.Request) (any, error) {
	file, err := os.Open("./resources/app-version.txt")
	if err != nil {
		return nil, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	if scanned := scanner.Scan(); scanned {
		return scanner.Text(), nil
	}

	return nil, fmt.Errorf("App not available")
}

func (a *AppHandler) HandleDownload(r *http.Request) (any, error) {
	return requtil.FileResponse{
		Path: "./resources/inkomi.apk",
		Name: "inkomi.apk",
		Headers: map[string]string{
			"Content-Type": "application/vnd.android.package-archive",
		},
	}, nil
}
