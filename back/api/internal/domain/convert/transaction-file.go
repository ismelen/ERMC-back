package convert

type TransactionFile struct {
	Id       string
	Filename string
	Size     int64
	status   TransactionFileStatus // Pending, Processing, Done, Error
	SrcPath  string
	Error    error
	Result   *TransactionResultFile
}

func NewTransactionFile(id, filename, path string, size int64) *TransactionFile {
	t := &TransactionFile{
		Id:       id,
		Filename: filename,
		Size:     size,
		SrcPath:  path,
	}

	t.status = TransactionFilePending
	return t
}

func (t *TransactionFile) Status() TransactionFileStatus {
	return t.status
}

func (t *TransactionFile) Processing() {
	t.status = TransactionFileProcessing
}

func (t *TransactionFile) Done() {
	t.status = TransactionFileDone
}

func (t *TransactionFile) SetError(err error) {
	t.status = TransactionFileError
	t.Error = err
}

func (t *TransactionFile) SetResult(result *TransactionResultFile) {
	t.Result = result
}
