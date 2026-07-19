// Package epubmerge fusiona varios ficheros .epub en uno solo, respetando
// el orden de la lista de paths recibida, asignando un título/autor comunes
// y usando la cubierta (cover) del primer epub como cubierta del resultado.
//
// Idea clave del algoritmo:
//
//	Cada epub de origen se "reubica" dentro del epub resultante bajo un
//	directorio propio (OEBPS/b0/, OEBPS/b1/, ...), conservando exactamente
//	su estructura interna relativa (imágenes, CSS, capítulos...). Como los
//	enlaces internos de un epub casi siempre son rutas relativas dentro de
//	su propio paquete, al mover el árbol completo en bloque esos enlaces
//	se preservan sin necesidad de reescribir el contenido de los XHTML/CSS.
//	Solo hace falta reescribir tres piezas a nivel de "libro completo":
//	manifest, spine (orden de lectura) y la tabla de contenidos (nav/ncx).
//
// Limitación asumida: si algún epub de origen usa rutas "../" que escapan
// de la carpeta que contiene su OPF, esos enlaces podrían romperse al
// añadir un nivel extra de anidamiento. Es un caso raro en epubs bien
// formados (y no debería darse en los generados por tu propio pipeline).
package epub

import (
	"archive/zip"
	"bytes"
	"crypto/rand"
	"encoding/xml"
	"fmt"
	"io"
	"ismelen/inkomi/internal/domain/convert"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ---------- Estructuras para parsear el epub de origen ----------

type epubContainer struct {
	Rootfiles []struct {
		FullPath string `xml:"full-path,attr"`
	} `xml:"rootfiles>rootfile"`
}

type opfPackage struct {
	XMLName  xml.Name    `xml:"package"`
	Metadata opfMetadata `xml:"metadata"`
	Manifest struct {
		Items []opfItem `xml:"item"`
	} `xml:"manifest"`
	Spine struct {
		Toc      string       `xml:"toc,attr"`
		ItemRefs []opfItemRef `xml:"itemref"`
	} `xml:"spine"`
}

type opfMetadata struct {
	Title    string    `xml:"title"`
	Creator  string    `xml:"creator"`
	Language string    `xml:"language"`
	Metas    []opfMeta `xml:"meta"`
}

type opfMeta struct {
	Name     string `xml:"name,attr"`
	Content  string `xml:"content,attr"`
	Property string `xml:"property,attr"`
}

type opfItem struct {
	ID         string `xml:"id,attr"`
	Href       string `xml:"href,attr"`
	MediaType  string `xml:"media-type,attr"`
	Properties string `xml:"properties,attr"`
}

type opfItemRef struct {
	IDRef  string `xml:"idref,attr"`
	Linear string `xml:"linear,attr"`
}

// sourceEpub representa un epub de origen ya cargado en memoria.
type sourceEpub struct {
	index    int
	baseName string
	opfDir   string // directorio (dentro del zip) que contiene el .opf
	opf      opfPackage
	files    map[string][]byte // ruta original dentro del zip -> contenido
}

func loadSourceEpub(epubPath string, index int) (*sourceEpub, error) {
	zr, err := zip.OpenReader(epubPath)
	if err != nil {
		return nil, fmt.Errorf("no se pudo abrir %s: %w", epubPath, err)
	}
	defer zr.Close()

	files := make(map[string][]byte, len(zr.File))
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, fmt.Errorf("%s: no se pudo leer %s: %w", epubPath, f.Name, err)
		}
		data, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return nil, fmt.Errorf("%s: error leyendo %s: %w", epubPath, f.Name, err)
		}
		files[f.Name] = data
	}

	opfRelPath, err := findOPFPath(files)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", epubPath, err)
	}
	opfData, ok := files[opfRelPath]
	if !ok {
		return nil, fmt.Errorf("%s: no se encontró el OPF en %q", epubPath, opfRelPath)
	}
	var pkg opfPackage
	if err := xml.Unmarshal(opfData, &pkg); err != nil {
		return nil, fmt.Errorf("%s: OPF inválido: %w", epubPath, err)
	}

	return &sourceEpub{
		index:    index,
		baseName: strings.TrimSuffix(filepath.Base(epubPath), filepath.Ext(epubPath)),
		opfDir:   path.Dir(opfRelPath),
		opf:      pkg,
		files:    files,
	}, nil
}

func findOPFPath(files map[string][]byte) (string, error) {
	data, ok := files["META-INF/container.xml"]
	if !ok {
		return "", fmt.Errorf("falta META-INF/container.xml (¿no es un epub válido?)")
	}
	var c epubContainer
	if err := xml.Unmarshal(data, &c); err != nil {
		return "", fmt.Errorf("container.xml inválido: %w", err)
	}
	if len(c.Rootfiles) == 0 || c.Rootfiles[0].FullPath == "" {
		return "", fmt.Errorf("container.xml sin rootfile válido")
	}
	return c.Rootfiles[0].FullPath, nil
}

// detectCoverItemID intenta localizar el id del item de portada, primero
// al estilo epub3 (properties="cover-image"), luego al estilo epub2
// (<meta name="cover" content="id"/>), y como último recurso busca un
// item de imagen cuyo id contenga "cover".
func detectCoverItemID(pkg opfPackage) string {
	for _, item := range pkg.Manifest.Items {
		if strings.Contains(item.Properties, "cover-image") {
			return item.ID
		}
	}
	for _, m := range pkg.Metadata.Metas {
		if m.Name == "cover" && m.Content != "" {
			return m.Content
		}
	}
	for _, item := range pkg.Manifest.Items {
		if strings.Contains(strings.ToLower(item.ID), "cover") && strings.HasPrefix(item.MediaType, "image/") {
			return item.ID
		}
	}
	return ""
}

// ---------- Fusión ----------

type mergedItem struct {
	ID         string
	Href       string // ruta relativa dentro de OEBPS/
	MediaType  string
	Properties string
}

type navEntry struct {
	Title string
	Href  string
}

// MergeEpubs fusiona los epubs indicados en paths (en ese orden) en un
// único fichero de salida outputPath, con el título y autor indicados y
// usando como cubierta la del primer epub de la lista.
func MergeEpubs(paths []*convert.TransactionResultFile, title, author, outputPath string) error {
	if len(paths) == 0 {
		return fmt.Errorf("no se han indicado epubs a fusionar")
	}

	sources := make([]*sourceEpub, 0, len(paths))
	for i, p := range paths {
		src, err := loadSourceEpub(p.Path, i)
		if err != nil {
			return err
		}
		sources = append(sources, src)
	}

	outFiles := make(map[string][]byte)
	var manifest []mergedItem
	var spineIDs []string
	var navEntries []navEntry
	var coverItemID string

	for _, src := range sources {
		bookDir := fmt.Sprintf("b%d", src.index)
		coverID := detectCoverItemID(src.opf)
		oldToNew := make(map[string]mergedItem, len(src.opf.Manifest.Items))

		for _, item := range src.opf.Manifest.Items {
			// El NCX y el nav (epub3) originales se omiten: generamos los
			// nuestros propios combinando todos los libros.
			if item.MediaType == "application/x-dtbncx+xml" || strings.Contains(item.Properties, "nav") {
				continue
			}

			origZipPath := path.Clean(path.Join(src.opfDir, item.Href))
			data, ok := src.files[origZipPath]
			if !ok {
				// Recurso referenciado en el manifest pero ausente en el
				// zip: lo saltamos en lugar de abortar toda la fusión.
				continue
			}

			newHref := path.Clean(path.Join(bookDir, item.Href))
			newZipPath := path.Join("OEBPS", newHref)
			outFiles[newZipPath] = data

			// Cada epub de origen suele declarar su propio "cover-image" en
			// el manifest. En el epub fusionado solo puede haber UNO (el del
			// primer libro), así que quitamos esa marca de todos los items
			// y solo se la volvemos a poner al elegido.
			props := removeToken(item.Properties, "cover-image")
			if src.index == 0 && item.ID == coverID {
				props = strings.TrimSpace(props + " cover-image")
			}

			mi := mergedItem{
				ID:         fmt.Sprintf("b%d_%s", src.index, sanitizeID(item.ID)),
				Href:       newHref,
				MediaType:  item.MediaType,
				Properties: strings.TrimSpace(props),
			}
			oldToNew[item.ID] = mi
			manifest = append(manifest, mi)

			if src.index == 0 && item.ID == coverID {
				coverItemID = mi.ID
			}
		}

		for _, ir := range src.opf.Spine.ItemRefs {
			if mi, ok := oldToNew[ir.IDRef]; ok {
				spineIDs = append(spineIDs, mi.ID)
			}
		}

		bookTitle := strings.TrimSpace(src.opf.Metadata.Title)
		if bookTitle == "" {
			bookTitle = src.baseName
		}
		var firstHref string
		if len(src.opf.Spine.ItemRefs) > 0 {
			if mi, ok := oldToNew[src.opf.Spine.ItemRefs[0].IDRef]; ok {
				firstHref = mi.Href
			}
		}
		navEntries = append(navEntries, navEntry{Title: bookTitle, Href: firstHref})
	}

	if coverItemID == "" {
		return fmt.Errorf("no se pudo determinar la portada del primer epub (%s)", paths[0])
	}

	// El propio nav.xhtml y toc.ncx que vamos a generar también deben
	// figurar en el manifest.
	manifest = append(manifest,
		mergedItem{ID: "nav", Href: "nav.xhtml", MediaType: "application/xhtml+xml", Properties: "nav"},
		mergedItem{ID: "ncx", Href: "toc.ncx", MediaType: "application/x-dtbncx+xml"},
	)

	outFiles["mimetype"] = []byte("application/epub+zip")
	outFiles["META-INF/container.xml"] = []byte(containerXML)
	outFiles["OEBPS/content.opf"] = []byte(buildOPF(title, author, manifest, spineIDs, coverItemID, "ncx"))
	outFiles["OEBPS/nav.xhtml"] = []byte(buildNav(title, navEntries))
	outFiles["OEBPS/toc.ncx"] = []byte(buildNCX(title, navEntries))

	return writeEpubZip(outputPath, outFiles)
}

// ---------- Generación de los ficheros de empaquetado ----------

const containerXML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`

func buildOPF(title, author string, manifest []mergedItem, spineIDs []string, coverItemID, tocID string) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">` + "\n")
	b.WriteString(`  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">` + "\n")
	fmt.Fprintf(&b, "    <dc:identifier id=\"pub-id\">urn:uuid:%s</dc:identifier>\n", newUUID())
	fmt.Fprintf(&b, "    <dc:title>%s</dc:title>\n", xmlEscape(title))
	fmt.Fprintf(&b, "    <dc:creator>%s</dc:creator>\n", xmlEscape(author))
	b.WriteString(`    <dc:language>es</dc:language>` + "\n")
	fmt.Fprintf(&b, "    <meta property=\"dcterms:modified\">%s</meta>\n", time.Now().UTC().Format("2006-01-02T15:04:05Z"))
	fmt.Fprintf(&b, "    <meta name=\"cover\" content=%q/>\n", coverItemID)
	b.WriteString(`  </metadata>` + "\n")

	b.WriteString(`  <manifest>` + "\n")
	for _, m := range manifest {
		props := ""
		if m.Properties != "" {
			props = fmt.Sprintf(` properties=%q`, m.Properties)
		}
		fmt.Fprintf(&b, "    <item id=%q href=%q media-type=%q%s/>\n", m.ID, m.Href, m.MediaType, props)
	}
	b.WriteString(`  </manifest>` + "\n")

	fmt.Fprintf(&b, "  <spine toc=%q>\n", tocID)
	for _, id := range spineIDs {
		fmt.Fprintf(&b, "    <itemref idref=%q/>\n", id)
	}
	b.WriteString(`  </spine>` + "\n")
	b.WriteString(`</package>` + "\n")
	return b.String()
}

func buildNav(title string, entries []navEntry) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">` + "\n")
	b.WriteString(fmt.Sprintf("<head><title>%s</title></head>\n<body>\n", xmlEscape(title)))
	b.WriteString(`  <nav epub:type="toc" id="toc">` + "\n")
	fmt.Fprintf(&b, "    <h1>%s</h1>\n    <ol>\n", xmlEscape(title))
	for _, e := range entries {
		if e.Href == "" {
			continue
		}
		fmt.Fprintf(&b, "      <li><a href=%q>%s</a></li>\n", e.Href, xmlEscape(e.Title))
	}
	b.WriteString("    </ol>\n  </nav>\n</body>\n</html>\n")
	return b.String()
}

func buildNCX(title string, entries []navEntry) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">` + "\n")
	fmt.Fprintf(&b, "  <head>\n    <meta name=\"dtb:uid\" content=\"urn:uuid:%s\"/>\n  </head>\n", newUUID())
	fmt.Fprintf(&b, "  <docTitle><text>%s</text></docTitle>\n  <navMap>\n", xmlEscape(title))
	order := 0
	for _, e := range entries {
		if e.Href == "" {
			continue
		}
		order++
		fmt.Fprintf(&b, "    <navPoint id=\"navpoint-%d\" playOrder=\"%d\">\n      <navLabel><text>%s</text></navLabel>\n      <content src=%q/>\n    </navPoint>\n",
			order, order, xmlEscape(e.Title), e.Href)
	}
	b.WriteString("  </navMap>\n</ncx>\n")
	return b.String()
}

// writeEpubZip escribe el zip final. El fichero "mimetype" debe ser la
// primera entrada del zip y no debe ir comprimido: es un requisito del
// formato EPUB para que los lectores puedan identificarlo rápidamente.
func writeEpubZip(outputPath string, files map[string][]byte) error {
	f, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("no se pudo crear %s: %w", outputPath, err)
	}
	defer f.Close()

	zw := zip.NewWriter(f)

	mimeWriter, err := zw.CreateHeader(&zip.FileHeader{Name: "mimetype", Method: zip.Store})
	if err != nil {
		return err
	}
	if _, err := mimeWriter.Write(files["mimetype"]); err != nil {
		return err
	}

	names := make([]string, 0, len(files)-1)
	for name := range files {
		if name != "mimetype" {
			names = append(names, name)
		}
	}
	sort.Strings(names) // orden determinista, útil para reproducibilidad/tests

	for _, name := range names {
		w, err := zw.CreateHeader(&zip.FileHeader{Name: name, Method: zip.Deflate})
		if err != nil {
			return err
		}
		if _, err := w.Write(files[name]); err != nil {
			return err
		}
	}

	return zw.Close()
}

// ---------- utilidades ----------

func xmlEscape(s string) string {
	var buf bytes.Buffer
	_ = xml.EscapeText(&buf, []byte(s))
	return buf.String()
}

// sanitizeID limpia un id de manifest para que siga siendo un NCName válido
// tras el prefijo "bN_" que le añadimos.
// removeToken elimina una palabra concreta de una lista de "properties"
// separadas por espacios (p.ej. quitar "cover-image" de "cover-image scripted").
func removeToken(s, token string) string {
	fields := strings.Fields(s)
	out := fields[:0]
	for _, f := range fields {
		if f != token {
			out = append(out, f)
		}
	}
	return strings.Join(out, " ")
}

func sanitizeID(id string) string {
	if id == "" {
		return "item"
	}
	var b strings.Builder
	for _, r := range id {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_', r == '.':
			b.WriteRune(r)
		default:
			b.WriteRune('_')
		}
	}
	return b.String()
}

func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
