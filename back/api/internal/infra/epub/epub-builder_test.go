package epub_test

import (
	"strings"
	"testing"

	"github.com/bitfield/checkepub"
	"github.com/stretchr/testify/assert"
)

func TestEpubBuilder_OnBuild_ContainsRequiredFiles(t *testing.T) {
	path := buildFakeEpub(t, "test-required-files", 0, true)
	r := openFakeZip(t, path)

	cases := []struct{ name, path string }{
		{"container.xml", "META-INF/container.xml"},
		{"content.opf", "OEBPS/content.opf"},
		{"ncx", "OEBPS/toc.ncx"},
		{"nav", "OEBPS/nav.xhtml"},
		{"styles", "OEBPS/Text/style.css"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()

			entry := getFakeZipEntry(r, c.path)
			assert.NotNil(t, entry)
		})
	}
}

func TestEpubBuilder_OnBuild_ShouldExistsAsXHTMLAsPagesAdded(t *testing.T) {
	t.Parallel()

	// Arrange
	pages := 2
	path := buildFakeEpub(t, "tet-add-page", pages, true)
	r := openFakeZip(t, path)

	// Act
	xhtmlFound := 0
	for _, f := range r.File {
		if strings.HasPrefix(f.Name, "OEBPS/Text/") && strings.HasSuffix(f.Name, ".xhtml") {
			xhtmlFound++
		}
	}

	//Assert
	assert.Equal(t, xhtmlFound, pages)
}

func TestEpubBuilder_OnRightToLeft_OPFShouldContainKey(t *testing.T) {
	cases := []struct {
		name string
		rtl  bool
		key  string
	}{
		{"rtl", true, "rtl"},
		{"ltr", false, "ltr"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			path := buildFakeEpub(t, "order-test", 2, c.rtl)
			r := openFakeZip(t, path)

			// Act
			opf := getFakeZipEntryContent(t, r, "OEBPS/content.opf")

			// Assert
			assert.Contains(t, opf, c.key)
		})
	}
}

func TestEpubBuilder_OnBuild_ShouldBuildValidEpub(t *testing.T) {
	t.Parallel()

	// Arrange
	path := buildFakeEpub(t, "validation-test", 10, true)

	// Assert
	result, err := checkepub.Check(path)

	assert.NoError(t, err)
	assert.Equal(t, result.Status, checkepub.StatusValid)
	assert.Len(t, result.Errors, 0)
}
