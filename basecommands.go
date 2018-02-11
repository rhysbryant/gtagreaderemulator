package tagreaderemulator

type TagReaderAPI interface {
	WritePage(pageIndex int, pageData []byte) error
	ReadPages(startPageIndex int) ([]byte, error)
	DisableTag() error
	EnableTag() error
}
