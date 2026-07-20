package convert

type TransactionResultFile struct {
	Id       string
	Filename string
	Path     string
	Size     int64
	Files    []*TransactionFile
}

func NewTransactionResultFile(id, filename, path string, size int64, files []*TransactionFile) *TransactionResultFile {
	result := &TransactionResultFile{
		Filename: filename,
		Path:     path,
		Size:     size,
		Files:    files,
		Id:       id,
	}

	for _, file := range files {
		file.SetResult(result)
	}

	return result
}

func (t *TransactionResultFile) SetError(err error) {
	for _, file := range t.Files {
		file.SetError(err)
	}
}
