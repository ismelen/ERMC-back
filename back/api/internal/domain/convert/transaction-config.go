package convert

import (
	"fmt"
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
	Profile     *EReaderProfile
	Cant        int32
	Size        int32
	Type        string // cbz, epub, md5
}

func (t *TransactionConfig) GetTitle(files []*TransactionResultFile) string {
	fstChName := files[0].Name
	lastChName := files[len(files)-1].Name

	if !t.Merge && t.Title == "" {
		return fstChName
	}

	simpleName := func() string {
		if len(files) == 1 {
			return fstChName
		}
		return fmt.Sprintf("%s - %s", fstChName, lastChName)
	}

	if t.Title == "" {
		return simpleName()
	}

	fstChNum, fstOk := ExtractChapterNumber(fstChName)
	lastChNum, lastOk := ExtractChapterNumber(lastChName)
	if !fstOk || !lastOk {
		return simpleName()
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

var leadingChapterPattern = regexp.MustCompile(`^(\d+(?:\.\d+)?)---`)

var fallbackNumberPattern = regexp.MustCompile(`\d+(?:\.\d+)?`)

var noisePattern = regexp.MustCompile(`(?i)\b(19|20)\d{2}\b|\b\d{3,4}p\b|\bvol(?:ume)?\.?\s*\d+`)

var hashSuffixPattern = regexp.MustCompile(`(?i)[0-9a-f]{4,8}$`)

func ExtractChapterNumber(filename string) (float64, bool) {
	if m := leadingChapterPattern.FindStringSubmatch(filename); m != nil {
		if n, err := strconv.ParseFloat(m[1], 64); err == nil {
			return n, true
		}
	}

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
	cleaned = hashSuffixPattern.ReplaceAllString(cleaned, "")
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
