package routes

import (
	"ismelen/inkomi/internal/infra/api/handlers"
	"ismelen/inkomi/internal/infra/api/requtil"

	"github.com/go-chi/chi/v5"
)

func SetupAppRoutes(api *chi.Mux, public *chi.Mux, handler *handlers.AppHandler) {
	rApi := chi.NewRouter()
	api.Mount("/app", rApi)
	rApi.Get("/version", requtil.Wrap(handler.HandleVersion))

	rPublic := chi.NewRouter()
	public.Mount("/app", rPublic)
	rPublic.Get("/download", requtil.Wrap(handler.HandleDownload))
}
