package usecases

import (
	"ismelen/inkomi/internal/domain/convert"
	"ismelen/inkomi/internal/shared/uid"
)

type EpubTransactionUC struct {
	BaseTransactionUC
	tranStore convert.TransactionStoreI
}

func NewEpubTransactionUC(
	pushNotifier convert.PushNotifier,
	cloud convert.CloudStorage,
) *EpubTransactionUC {
	t := &EpubTransactionUC{
		BaseTransactionUC: BaseTransactionUC{
			pushNotifier: pushNotifier,
			cloud:        cloud,
		},
	}

	t.processor = t
	return t
}

func (e EpubTransactionUC) Process(file *convert.TransactionFile, tran *convert.Transaction, transPath string) *convert.TransactionResultFile {
	return convert.NewTransactionResultFile(uid.GetRandomID(6), file.Name, file.SrcPath, file.Size, []*convert.TransactionFile{file})
}
