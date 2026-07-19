package convert

import (
	"fmt"
	"ismelen/inkomi/internal/domain/manga"
	"regexp"
	"strconv"
)

type TransactionConfig struct {
	Author      string
	Title       string
	Merge       bool
	Cloud       bool
	CloudToken  string
	CloudFolder string
	NotifyToken string
	Profile     *manga.Profile
	Cant        int32
	Type        string // cbz, epub, md5
}

func (t *TransactionConfig) GetTitle(files []*TransactionResultFile) string {
	if !t.Merge && t.Title == "" {
		return files[0].Filename
	}

	fstChName := files[0].Filename
	lastChName := files[len(files)-1].Filename

	if t.Title == "" {
		if len(files) == 1 {
			return fstChName
		}
		return fmt.Sprintf("%s - %s", fstChName, lastChName)

	}

	fstChNum, fstOk := ExtractChapterNumber(fstChName)
	lastChNum, lastOk := ExtractChapterNumber(lastChName)

	if !fstOk || !lastOk {
		if len(files) == 1 {
			return fstChName
		}
		return fmt.Sprintf("%s - %s", fstChName, lastChName)
	}

	if len(files) == 1 {
		return fmt.Sprintf("%s Ch.%g", t.Title, fstChNum)
	}
	return fmt.Sprintf("%s Ch.[%g - %g]", t.Title, fstChNum, lastChNum)
}

var chapterPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\bch(?:apter)?\.?\s*(\d+(?:\.\d+)?)`),
	regexp.MustCompile(`(?i)\bcap[ií]?tulo\.?\s*(\d+(?:\.\d+)?)|(?i)\bcap\.?\s*(\d+(?:\.\d+)?)`),
	regexp.MustCompile(`(?i)\bepisodi?o?\.?\s*(\d+(?:\.\d+)?)`),
	regexp.MustCompile(`(?:^|[\\/])#(\d+(?:\.\d+)?)\s*-`),
}

var fallbackNumberPattern = regexp.MustCompile(`\d+(?:\.\d+)?`)

var noisePattern = regexp.MustCompile(`(?i)\b(19|20)\d{2}\b|\b\d{3,4}p\b|\bvol(?:ume)?\.?\s*\d+`)

func ExtractChapterNumber(filename string) (float64, bool) {
	for _, re := range chapterPatterns {
		m := re.FindStringSubmatch(filename)
		if m == nil {
			continue
		}
		for _, g := range m[1:] {
			if g != "" {
				if n, err := strconv.ParseFloat(g, 64); err == nil {
					return n, true
				}
			}
		}
	}

	cleaned := noisePattern.ReplaceAllString(filename, "")
	matches := fallbackNumberPattern.FindAllString(cleaned, -1)
	if len(matches) == 0 {
		return 0, false
	}

	last := matches[len(matches)-1]
	if n, err := strconv.ParseFloat(last, 64); err == nil {
		return n, true
	}

	return 0, false
}
