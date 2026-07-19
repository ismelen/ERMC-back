package usecases

import (
	"ismelen/inkomi/internal/domain/convert"
)

type EpubTransactionUC struct {
	BaseTransactionUC
	tranStore convert.TransactionStoreI
}

func NewEpubTransactionUC(
	pushNotifier convert.PushNotifier,
	cloud convert.CloudStorage,
) *EpubTransactionUC {
	return &EpubTransactionUC{
		BaseTransactionUC: BaseTransactionUC{
			pushNotifier: pushNotifier,
			cloud:        cloud,
		},
	}
}

func (e EpubTransactionUC) Process(file *convert.TransactionFile, tran *convert.Transaction, transPath string) *convert.TransactionResultFile {
	return convert.NewTransactionResultFile(file.Filename, file.SrcPath, file.Size, []*convert.TransactionFile{file})
}
