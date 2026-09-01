package book

type BooksProvider interface {
	GetMirror() (BooksSource, bool)
	Refresh() bool
}
