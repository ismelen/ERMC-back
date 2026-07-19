package usecases

import (
	"archive/zip"
	"context"
	"fmt"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/infra/epub"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/facette/natsort"
	"github.com/pgaskin/kepubify/v4/kepub"
)

type TransactionUC interface {
	Process(file *convert.TransactionFile, tran *convert.Transaction, transPath string) *convert.TransactionResultFile
	Execute(file *convert.TransactionFile, tran *convert.Transaction, transPath string)
}

const MAX_CHUNK_SIZE = 200 << 20

type BaseTransactionUC struct {
	pushNotifier convert.PushNotifier
	cloud        convert.CloudStorage
}

func (m BaseTransactionUC) Execute(file *convert.TransactionFile, tran *convert.Transaction, transPath string) {
	file.Status = "processing"
	result := m.Process(file, tran, transPath)

	if !tran.Config.Merge {
		if err := m.KepubifyResult(tran, result); err != nil {
			file.SetError(err)
			return
		}
	}

	stats, err := os.Stat(result.Path)
	if err != nil {
		file.SetError(err)
		return
	}
	result.Size = stats.Size()

	completed, err := tran.AddResult(result)
	if err != nil {
		file.SetError(err)
		return
	}
	file.Status = "done"

	if !(tran.Config.Merge && tran.Config.Type == "cbz") {
		m.SendAndNotify(tran, result)
		return
	}

	if !completed {
		return
	}

	m.ChopAndMerge(tran, transPath)
	for _, result := range tran.ResultFiles {
		m.SendAndNotify(tran, result)
	}
}

func (m BaseTransactionUC) ChopAndMerge(tran *convert.Transaction, transPath string) {
	slices.SortFunc(tran.ResultFiles, func(a, b *convert.TransactionResultFile) int {
		if natsort.Compare(a.Filename, b.Filename) {
			return -1
		}
		return 1
	})

	var mergedFiles []*convert.TransactionResultFile
	var filesToMerge []*convert.TransactionResultFile
	var size int64

	for _, result := range tran.ResultFiles {
		if size+result.Size >= MAX_CHUNK_SIZE {
			result, err := m.MergeFiles(filesToMerge, size, tran, transPath)
			if err != nil {
				m.NotifyError(tran, err)
				for _, fileToMerge := range filesToMerge {
					fileToMerge.SetError(err)
				}
				return
			}
			mergedFiles = append(mergedFiles, result)

			filesToMerge = []*convert.TransactionResultFile{}
			size = 0
		}

		size += result.Size
		filesToMerge = append(filesToMerge, result)
		defer os.RemoveAll(result.Path)
	}

	if len(filesToMerge) > 0 {
		result, err := m.MergeFiles(filesToMerge, size, tran, transPath)
		if err != nil {
			m.NotifyError(tran, err)
			return
		}
		mergedFiles = append(mergedFiles, result)
	}

	tran.ResultFiles = mergedFiles
}

func (m BaseTransactionUC) MergeFiles(results []*convert.TransactionResultFile, size int64, tran *convert.Transaction, transPath string) (*convert.TransactionResultFile, error) {
	title := tran.Config.GetTitle(tran.ResultFiles)
	filename := fmt.Sprintf("%s%s", title, ".epub")
	outPath := filepath.Join(transPath, tran.Id, filename)
	err := epub.MergeEpubs(results, title, tran.Config.Author, outPath)
	if err != nil {
		return nil, err
	}

	var files []*convert.TransactionFile
	for _, res := range results {
		files = append(files, res.Files...)
	}

	result := convert.NewTransactionResultFile(
		filename,
		outPath,
		size,
		files,
	)

	if tran.Config.Profile.IsKepub {
		if err := m.KepubifyResult(tran, result); err != nil {
			return nil, err
		}
	}

	return result, nil
}

func (m BaseTransactionUC) KepubifyResult(tran *convert.Transaction, result *convert.TransactionResultFile) error {
	if tran.Config.Profile.IsKepub && !strings.Contains(result.Filename, ".kepub") {
		noExtFilename := strings.TrimSuffix(result.Filename, filepath.Ext(result.Filename))
		kPath, err := m.KepubifyEpub(result.Path, filepath.Dir(result.Path), noExtFilename)

		if err != nil {
			return err
		}

		os.RemoveAll(result.Path)
		result.Filename = filepath.Base(kPath)
		result.Path = kPath
	}

	return nil
}

func (m BaseTransactionUC) KepubifyEpub(src, outBase, filename string) (string, error) {
	kPath := filepath.Join(outBase, filename+".kepub.epub")
	out, err := os.Create(kPath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	in, err := zip.OpenReader(src)
	if err != nil {
		return "", err
	}
	defer in.Close()

	converter := kepub.NewConverter()
	ctx := context.Background()

	return kPath, converter.Convert(ctx, out, in)
}

func (m BaseTransactionUC) Process(file *convert.TransactionFile, tran *convert.Transaction, transPath string) *convert.TransactionResultFile {
	return nil
}

func (b *BaseTransactionUC) SendAndNotify(tran *convert.Transaction, result *convert.TransactionResultFile) {
	if tran.Config.Cloud {
		b.pushNotifier.Send(
			tran.Config.NotifyToken,
			convert.NewSuccessMessage(tran, fmt.Sprintf("Sending %s to cloud", result.Filename)),
		)

		if err := b.cloud.Upload(result.Path, tran.Config.CloudToken, tran.Config.CloudFolder); err != nil {
			b.pushNotifier.Send(
				tran.Config.NotifyToken,
				convert.NewErrorMessage(tran, fmt.Errorf("Cannot send %s to cloud", result.Filename)),
			)
			result.SetError(err)
		}
		return
	}

	b.pushNotifier.Send(
		tran.Config.NotifyToken,
		convert.NewSuccessMessage(tran, fmt.Sprintf("%s transaction ready", result.Filename)),
	)
}

func (b BaseTransactionUC) NotifyError(tran *convert.Transaction, err error) {
	b.pushNotifier.Send(
		tran.Config.NotifyToken,
		convert.PushMessage{
			Title:   "Error",
			Message: err.Error(),
			Id:      tran.Id,
			Err:     err.Error(),
		},
	)
}
