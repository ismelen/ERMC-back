package routes

import (
	"ismelen/inkomi/internal/infra/api/dto"
	"ismelen/inkomi/internal/infra/api/handlers"
	"ismelen/inkomi/internal/infra/api/requtil"

	"github.com/go-chi/chi/v5"
)

func SetupTransactionRoutes(api *chi.Mux, handler *handlers.TransactionsV2Handler) {
	r := chi.NewRouter()
	api.Mount("/transactions", r)

	r.Post("/start", requtil.Wrap[dto.TransactionStartResponse](handler.HandleStartTransaction))
	r.Post("/{tranId}/attach", requtil.Wrap[string](handler.HandleAttachFile))
	r.Post("/{tranId}/retry/{fileId}", requtil.Wrap[string](handler.HandleRetryFile))

	r.Get("/{tranId}/status", requtil.Wrap[dto.TransactionStatusResponse](handler.HandleGetStatus))
	r.Put("/{tranId}/cancel", requtil.Wrap(handler.HandleCancel))
	r.Get("/{tranId}/download/{fileId}", requtil.Wrap[requtil.FileResponse](handler.HandleDownload))
}
