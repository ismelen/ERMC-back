package fs

import "ismelen/inkomi/internal/domain/manga"

func PdfToChapter(file string, dstPath string) (*manga.Chapter, error) {
	filename, chapterPath, pages, err := UnzipPdf(file, dstPath)
	if err != nil {
		return nil, err
	}

	return manga.NewChapter(filename, chapterPath, pages), nil
}
