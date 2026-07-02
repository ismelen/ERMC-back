package main

import (
	"context"
	"ismelen/inkomi/internal/infra/api/handlers"
	"ismelen/inkomi/internal/infra/api/routes"
	"ismelen/inkomi/internal/infra/cloud"
	"ismelen/inkomi/internal/infra/epub"
	infraImage "ismelen/inkomi/internal/infra/image"
	"ismelen/inkomi/internal/infra/libgen"
	"ismelen/inkomi/internal/infra/push"
	"ismelen/inkomi/internal/infra/store"
	"ismelen/inkomi/internal/usecases"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	api := chi.NewRouter()

	api.Use(
		middleware.RequestID,
		middleware.Logger,
		middleware.Recoverer,
		middleware.RequestSize(250<<20),
		cors.AllowAll().Handler,
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	libgenServ := libgen.New()
	libgenServ.StartDiscovery(ctx, 12*time.Hour)

	pushNotifier := &push.FirebasePushNotifier{}
	pushNotifier.Init()

	tranStore := store.GetManager()

	imgProcessor := infraImage.NewPageProcessor()
	bookBuilder := epub.New()
	dropbox := &cloud.DropboxCloud{}

	epubUC := usecases.NewEpubTransactionUC(pushNotifier, tranStore, dropbox)
	mangaUC := usecases.NewMangaTransactionUC(pushNotifier, tranStore, bookBuilder, imgProcessor, dropbox)
	remoteUC := usecases.NewRemoteTransactionUC(pushNotifier, tranStore, libgenServ, dropbox)

	convertHandler := handlers.NewConvertHandler(mangaUC, epubUC, remoteUC)
	routes.SetupConvertRoutes(api, convertHandler)

	libgenHandler := handlers.NewLibgenHandler(libgenServ)
	routes.SetupLibgenRoutes(api, libgenHandler)

	log.Println("Starting at port 3000")
	if err := http.ListenAndServe(":3000", api); err != nil {
		log.Fatal(err)
	}
}
