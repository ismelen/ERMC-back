package usecases

import (
	"context"
	"fmt"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/domain/manga"
	"ismelen/inkomi/internal/infra/epub"
	"ismelen/inkomi/internal/infra/fs"
	"ismelen/inkomi/internal/shared/uid"
	"os"
	"path/filepath"
	"runtime"

	"golang.org/x/sync/errgroup"
)

type CBZTransactionUC struct {
	BaseTransactionUC
	imageSettings *manga.ImageSettings
	imgProcessor  manga.ImageProcessor
}

func NewCBZTransactioUC(
	pushNotifier convert.PushNotifier,
	imgProcessor manga.ImageProcessor,
	cloud convert.CloudStorage,
) *CBZTransactionUC {
	return &CBZTransactionUC{
		BaseTransactionUC: BaseTransactionUC{
			pushNotifier: pushNotifier,
			cloud:        cloud,
		},
		imageSettings: manga.NewDefaultImageSettings(),
		imgProcessor:  imgProcessor,
	}
}

func (c CBZTransactionUC) Process(file *convert.TransactionFile, tran *convert.Transaction, transPath string) *convert.TransactionResultFile {
	dir := filepath.Dir(file.SrcPath)
	builder := epub.New().
		SetSettings(c.imageSettings, tran.Config.Profile).
		Start(file.Filename, dir)

	workers := max(1, runtime.NumCPU()*3/4)

	chaptersDir := filepath.Join(dir, "chapters")
	defer os.RemoveAll(chaptersDir)

	chapter, err := fs.FileToChapter(file.SrcPath, chaptersDir)
	if err != nil {
		file.SetError(err)
		return nil
	}

	group, gctx := errgroup.WithContext(context.Background())
	group.SetLimit(workers)

	pages := chapter.GetOrderedPagePaths()
	processedPages := make([]*manga.Page, len(pages))

	for pIdx, pagePath := range pages {
		idx, path := pIdx, pagePath
		group.Go(func() error {
			if err := gctx.Err(); err != nil {
				return fmt.Errorf("Job canceled")
			}
			page, err := c.imgProcessor.ProcessPage(path, idx+1, tran.Config.Profile, c.imageSettings)
			if err != nil {
				return err
			}
			processedPages[idx] = page
			return nil
		})
	}

	if err := group.Wait(); err != nil {
		file.SetError(err)
		return nil
	}

	for i, page := range processedPages {
		builder.AddPage(page, i == 0)
	}

	path, err := builder.Build()
	filename := filepath.Base(path)

	return convert.NewTransactionResultFile(uid.GetRandomID(6), filename, path, file.Size, []*convert.TransactionFile{file})
}
