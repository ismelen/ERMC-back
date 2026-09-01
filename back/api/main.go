package main

import (
	"context"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/infra/allocator"
	"ismelen/inkomi/internal/infra/api/handlers"
	"ismelen/inkomi/internal/infra/api/routes"
	"ismelen/inkomi/internal/infra/cloud"
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
	public := chi.NewRouter()
	public.Mount("/api", api)

	api.Use(
		middleware.RequestID,
		middleware.Logger,
		middleware.Recoverer,
		middleware.RequestSize(210<<20),
		cors.AllowAll().Handler,
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	discoverer := libgen.NewSourceDiscoverer()
	booksManager := libgen.NewMirrorManager(discoverer)
	discoverer.Start(ctx, 12*time.Hour)

	pushNotifier := &push.FirebasePushNotifier{}
	if err := pushNotifier.Init(); err != nil {
		panic(err)
	}

	queue := allocator.NewQueue[convert.Transaction](
		allocator.NewAllocator(5<<20),
		50,
	)

	tranStore := store.NewTransactionStore(queue)

	imgProcessor := infraImage.NewPageProcessor()
	dropbox := &cloud.DropboxCloud{}

	searchBookUC := usecases.NewSearchBookUC(booksManager)
	downloadBookUC := usecases.NewDownloadBookUC(booksManager)
	checkBookSourceUC := usecases.NewCheckBooksSourceUC(booksManager)

	epubUC := usecases.NewEpubTransactionUC(pushNotifier, dropbox)
	mangaUC := usecases.NewMangaTransactionUC(pushNotifier, imgProcessor, dropbox)
	md5UC := usecases.NewMd5TransactionUC(pushNotifier, dropbox, downloadBookUC)

	transactionHandler := handlers.NewTransactionHandler(epubUC, mangaUC, md5UC, tranStore, pushNotifier)
	routes.SetupTransactionRoutes(api, transactionHandler)

	libgenHandler := handlers.NewLibgenHandler(checkBookSourceUC, searchBookUC, downloadBookUC)
	routes.SetupLibgenRoutes(api, libgenHandler)

	apphandler := handlers.NewAppHandler()
	routes.SetupAppRoutes(api, public, apphandler)

	log.Println("Starting at port 3000")
	if err := http.ListenAndServe(":3000", public); err != nil {
		log.Fatal(err)
	}
}
