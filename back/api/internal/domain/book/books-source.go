package book

type BooksSource interface {
	Search(query string) ([]Book, error)
	Download(md5 string) (*LibgenDownload, error)
	GetURL() string
}
