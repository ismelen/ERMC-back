package convert

import (
	"fmt"
	"ismelen/inkomi/internal/domain/manga"
	"log"
	"regexp"
	"strconv"
)

type TransactionConfig struct {
	Author      string
	Title       string
	Profile     string
	Merge       bool
	Id          string
	Cloud       bool
	CloudToken  string
	CloudFolder string
	NotifyToken string
	ProfileData *manga.Profile
}

func (t *TransactionConfig) WithId(id string) (*TransactionConfig, error) {
	trans := *t
	trans.Id = id

	profileData, err := NewProfile(t.Profile)
	if err != nil {
		return nil, err
	}

	trans.ProfileData = profileData
	return &trans, nil
}

func (t *TransactionConfig) UpdateTitle(chapters []*manga.Chapter) {
	log.Println(t.Title)

	if !t.Merge && t.Title == "" {
		t.Title = chapters[0].Filename
		return
	}

	fstChName := chapters[0].Filename
	lastChName := chapters[len(chapters)-1].Filename

	if t.Title == "" {
		if len(chapters) == 1 {
			t.Title = fstChName
			return
		}
		t.Title = fmt.Sprintf("%s - %s", fstChName, lastChName)
		return
	}

	fstChNum, fstOk := ExtractChapterNumber(fstChName)
	lastChNum, lastOk := ExtractChapterNumber(lastChName)

	if !fstOk || !lastOk {
		if len(chapters) == 1 {
			t.Title = fstChName
			return
		}
		t.Title = fmt.Sprintf("%s - %s", fstChName, lastChName)
		return
	}

	if len(chapters) == 1 {
		t.Title = fmt.Sprintf("%s Ch.%g", t.Title, fstChNum)
		return
	}
	t.Title = fmt.Sprintf("%s Ch.[%g - %g]", t.Title, fstChNum, lastChNum)
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
	// 1. Intentar patrones específicos primero (más fiables)
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
