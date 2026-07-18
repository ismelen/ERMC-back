package usecases

import (
	"fmt"
	"ismelen/inkomi/internal/domain/book"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/infra/fs"
	"os"
	"path/filepath"
)

type RemoteTransactionUC struct {
	BaseTransaction
	tranStore  convert.TransactionStore
	libgenServ book.LibgenService
}

func NewRemoteTransactionUC(
	pushNotifier convert.PushNotifier,
	tranStore convert.TransactionStore,
	libgenServ book.LibgenService,
	cloud convert.CloudStorage,
) *RemoteTransactionUC {
	return &RemoteTransactionUC{
		BaseTransaction: BaseTransaction{
			pushNotifier: pushNotifier,
			cloud:        cloud,
		},
		tranStore:  tranStore,
		libgenServ: libgenServ,
	}
}

func (e *RemoteTransactionUC) Execute(md5 string, config *convert.TransactionConfig, dstPath string) {
	tran := e.tranStore.StartTransaction(config.Id, dstPath, 1)
	if e.libgenServ == nil {
		tran.SetError(fmt.Errorf("Service unavailable"))
		return
	}

	result, err := e.libgenServ.Download(md5, 3)
	if err != nil {
		tran.SetError(err)
		e.NotifyError(config, err)
		return
	}
	defer result.Stream.Close()

	src, err := fs.CopyFromStream(result.Stream, filepath.Join(dstPath, result.Filename))
	if err != nil {
		e.NotifyError(config, err)
		os.RemoveAll(src)
		return
	}

	if config.ProfileData.IsKepub {
		kSrc, err := ConvertToKepub(src, dstPath, result.Title)
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
