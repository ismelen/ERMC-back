package usecases

import (
	"archive/zip"
	"context"
	"ismelen/inkomi/internal/domain/convert"
	"os"
	"path/filepath"

	"github.com/pgaskin/kepubify/v4/kepub"
)

type EpubTransactionUC struct {
	BaseTransaction
	tranStore convert.TransactionStore
}

func NewEpubTransactionUC(
	pushNotifier convert.PushNotifier,
	tranStore convert.TransactionStore,
	cloud convert.CloudStorage,
) *EpubTransactionUC {
	return &EpubTransactionUC{
		BaseTransaction: BaseTransaction{
			pushNotifier: pushNotifier,
			cloud:        cloud,
		},
		tranStore: tranStore,
	}
}

func (e *EpubTransactionUC) Execute(src string, config *convert.TransactionConfig, dstPath string) {
	tran := e.tranStore.StartTransaction(config.Id, dstPath, 1)

	if config.ProfileData.IsKepub {
		kSrc, err := ConvertToKepub(src, dstPath, config.Title)
		if err != nil {
			e.NotifyError(config, err)
			tran.SetError(err)
			return
		}
		os.RemoveAll(src)
		src = kSrc
	}

	tran.SetResultPath(src)
	e.SendAndNotify(config, tran, src)

	tran.SetDone()
}

func ConvertToKepub(src, outBase, filename string) (string, error) {
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
