package book

import "context"

// LibgenService is the port used by HTTP handlers to interact with libgen.
type LibgenService interface {
	Search(query, language string, formats []string) ([]Book, error)
	Download(md5 string, retries int) (*LibgenDownload, error)
	CheckMirror(ctx context.Context) (bool, error)
}
