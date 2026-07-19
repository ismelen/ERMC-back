package usecases

import (
	"ismelen/inkomi/internal/domain/book"
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/infra/fs"
	"os"
	"path/filepath"
)

type MD5UC struct {
	BaseTransactionUC
	libgenServ book.LibgenService
}

func NewMd5TransactionUC(
	pushNotifier convert.PushNotifier,
	libgenServ book.LibgenService,
	cloud convert.CloudStorage,
) *MD5UC {
	return &MD5UC{
		BaseTransactionUC: BaseTransactionUC{
			pushNotifier: pushNotifier,
			cloud:        cloud,
		},
		libgenServ: libgenServ,
	}
}

func (m MD5UC) Process(file *convert.TransactionFile, tran *convert.Transaction, transPath string) *convert.TransactionResultFile {
	result, err := m.libgenServ.Download(file.SrcPath, 3)
	if err != nil {
		file.SetError(err)
		return nil
	}
	defer result.Stream.Close()

	dstPath := filepath.Join(transPath, tran.Id, file.Id, result.Filename)
	src, err := fs.CopyFromStream(result.Stream, dstPath)
	if err != nil {
		file.SetError(err)
		os.RemoveAll(src)
		return nil
	}

	return convert.NewTransactionResultFile(result.Filename, dstPath, 0, []*convert.TransactionFile{file})
}
