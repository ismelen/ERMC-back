package routes

import (
	"ismelen/inkomi/internal/domain/book"
	"ismelen/inkomi/internal/infra/api/handlers"
	"ismelen/inkomi/internal/infra/api/requtil"

	"github.com/go-chi/chi/v5"
)

func SetupLibgenRoutes(api *chi.Mux, handler *handlers.LibgenHandler) {
	r := chi.NewRouter()
	api.Mount("/books", r)

	r.Get("/search", requtil.Wrap[[]book.Book](handler.HandleSearchBook))
	r.Get("/download/{md5}", requtil.Wrap[requtil.FileResponse](handler.HandleDownloadBook))
	r.Get("/check-mirror", requtil.Wrap[handlers.CheckMirrorResponse](handler.HandleCheckMirror))
}
