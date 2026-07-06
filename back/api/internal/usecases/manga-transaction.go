package usecases

import (
	"context"
	"fmt"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/domain/manga"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"golang.org/x/sync/errgroup"
)

type MangaTransactionUC struct {
	BaseTransaction
	imageSettings *manga.ImageSettings
	tranStore     convert.TransactionStore
	bookBuilder   manga.BookBuilder
	imgProcessor  manga.ImageProcessor
}

func NewMangaTransactionUC(
	pushNotifier convert.PushNotifier,
	tranStore convert.TransactionStore,
	bookBuilder manga.BookBuilder,
	imgProcessor manga.ImageProcessor,
	cloud convert.CloudStorage,
) *MangaTransactionUC {
	return &MangaTransactionUC{
		BaseTransaction: BaseTransaction{
			pushNotifier: pushNotifier,
			cloud:        cloud,
		},
		imageSettings: manga.NewDefaultImageSettings(),
		tranStore:     tranStore,
		bookBuilder:   bookBuilder,
		imgProcessor:  imgProcessor,
	}
}

func (m *MangaTransactionUC) CheckProgress(id string) (int, error) {
	return m.tranStore.CheckProgress(id)
}

func (m *MangaTransactionUC) GetResultPath(id string) (string, error) {
	return m.tranStore.GetResultPath(id)
}

func (m *MangaTransactionUC) CancelTransaction(id string) {
	m.tranStore.Cancel(id)
}

func (m *MangaTransactionUC) Execute(chapters []*manga.Chapter, config *convert.TransactionConfig, dstPath string) {
	profile := config.ProfileData
	tran := m.tranStore.StartTransaction(config.Id, dstPath, m.getTransactionPages(chapters))

	progressChan := make(chan int)
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		resultPath, err := m.runConversion(ctx, chapters, config, profile, dstPath, progressChan)
		if err != nil {
			if canceled := ctx.Err(); canceled != nil {
				m.pushNotifier.Send(config.NotifyToken, convert.NewCancelMessage(config))
				m.tranStore.DeleteTransaction(config.Id)
			} else {
				m.NotifyError(config, err)
				tran.SetError(err)
			}
			return
		}
		tran.SetResultPath(resultPath)
		m.SendAndNotify(config, tran, resultPath)
	}()

	for range progressChan {
		if updated := tran.AddProcessedPages(1); !updated {
			cancel()
			return
		}
	}

	cancel()
	tran.SetDone()
}

func (m *MangaTransactionUC) runConversion(
	ctx context.Context,
	chapters []*manga.Chapter,
	config *convert.TransactionConfig,
	profile *manga.Profile,
	dstPath string,
	progressChan chan int,
) (string, error) {
	defer close(progressChan)

	builder := m.bookBuilder.
		SetSettings(m.imageSettings, profile).
		Start(config.Title, dstPath)

	workers := max(1, runtime.NumCPU()*3/4)

	for _, chapter := range chapters {
		group, gctx := errgroup.WithContext(ctx)
		group.SetLimit(workers)
		pages := chapter.GetOrderedPagePaths()
		processedPages := make([]*manga.Page, len(pages))

		for pIdx, pagePath := range pages {
			idx, path := pIdx, pagePath
			group.Go(func() error {
				if err := gctx.Err(); err != nil {
					return fmt.Errorf("Job canceled")
				}
				page, err := m.imgProcessor.ProcessPage(path, idx+1, profile, m.imageSettings)
				if err != nil {
					return err
				}
				processedPages[idx] = page
				progressChan <- 1
				return nil
			})
		}

		if err := group.Wait(); err != nil {
			return "", err
		}

		for i, page := range processedPages {
			builder.AddPage(page, i == 0)
		}
	}

	path, err := builder.Build()
	defer os.RemoveAll(filepath.Join(dstPath, "chapters"))

	if err != nil {
		return "", err
	}

	if profile.IsKepub {
		kPath, err := ConvertToKepub(path, dstPath, config.Title)
		if err := os.RemoveAll(path); err != nil {
			log.Println(err.Error())
		}
		return kPath, err
	}
	return path, err
}

func (m *MangaTransactionUC) getTransactionPages(chapters []*manga.Chapter) int {
	var res int
	for _, chapter := range chapters {
		res += len(chapter.GetOrderedPagePaths())
	}
	return res
}
