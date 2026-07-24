package convert

import (
	"path/filepath"
	"strings"
)

type TransactionResultFile struct {
	Id       string
	Name     string
	Filename string
	Path     string
	Size     int64
	Files    []*TransactionFile
}

func NewTransactionResultFile(id, filename, path string, size int64, files []*TransactionFile) *TransactionResultFile {
	ext := filepath.Ext(filename)

	result := &TransactionResultFile{
		Name:     strings.TrimSuffix(filename, ext),
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
