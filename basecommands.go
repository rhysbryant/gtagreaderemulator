package tagreaderemulator

/**
 * @License LGPL
 * @Auther Rhys Bryant
 * @Copyright Rhys Bryant 2017
 *
 *	This file is part of TagReaderEmulatorClient
 *
 *   TagReaderEmulatorClient is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   any later version.
 *
 *   TagReaderEmulatorClient is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with TagReaderEmulatorClient.  If not, see <http://www.gnu.org/licenses/>.
**/

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"time"
)

const (
	tagCmd                       = 64
	tagUartCmdWritePage          = tagCmd + 1
	tagUartCmdReadPage           = tagCmd + 2
	tagUartCmdGetLastAuthKeySend = tagCmd + 3
	tagUartCmdGetLastPageRead    = tagCmd + 4
	tagUartCmdGetLastPageWrite   = tagCmd + 5
	tagUartCmdResetStats         = tagCmd + 6
	tagPageSize                  = 4
	tagNumPagesReturned          = 4
	readerCmd                    = 128
	readerCmdDisable             = readerCmd + 1
	readerCmdEnable              = readerCmd + 2
	readerCmdEnterBootloader     = readerCmd + 5
	readerCmdGetVersionInfo      = readerCmd + 6
	writeSuccess                 = 1
)

type Client struct {
	reader  io.Reader
	writer  io.Writer
	timeout time.Duration
}

type VersionInfo struct {
	versionstr      string
	compileDateTime string
}

func (vi *VersionInfo) String() string {
	return fmt.Sprintf("%s (%s)", vi.versionstr, vi.compileDateTime)
}

//returns the firmware version string
func (vi *VersionInfo) VersionStr() string {
	return vi.versionstr
}

//returns the date and time the firmware was compiled
func (vi *VersionInfo) DateTimeStr() string {
	return vi.compileDateTime
}

func NewClient(reader io.Reader, writer io.Writer, timeout time.Duration) *Client {
	return &Client{reader, writer, timeout}
}

func (v *Client) readBytes(count int) ([]byte, error) {
	recCount := 0
	buf := make([]byte, count)
	end := time.Now().Add(time.Millisecond * v.timeout)
	for recCount < count && time.Now().Before(end) {
		c, err := v.reader.Read(buf[recCount:])
		if err != nil {
			return nil, err
		}
		recCount += c
	}

	return buf, nil
}

//returns the 4 bytes of the auth key that was last sent by the I2c master to the emulator
func (v *Client) GetLastAuth() ([]byte, error) {
	d := []byte{tagUartCmdGetLastAuthKeySend}
	if _, err := v.writer.Write(d); err != nil {
		return nil, err
	}
	return v.readBytes(4)
}

//returns the index of the last page that was read from the emulated tag by the I2c master
func (v *Client) GetLastPageReadIndex() (int, error) {
	d := []byte{tagUartCmdGetLastPageRead}
	if _, err := v.writer.Write(d); err != nil {
		return -1, err
	}
	response, err := v.readBytes(1)
	if err != nil {
		return -1, err
	}
	return int(response[0]), nil
}

//returns the index and the 4 bytes of the last page written by the I2c master to the emulated tag
func (v *Client) GetLastWritenPageData() ([]byte, error) {
	d := []byte{tagUartCmdGetLastPageWrite}
	if _, err := v.writer.Write(d); err != nil {
		return nil, err
	}
	return v.readBytes(5)
}

//writes 4 bytes for the given page index
func (v *Client) WritePage(pageIndex int, pageData []byte) error {
	d := []byte{tagUartCmdWritePage, byte(pageIndex)}
	d = append(d, pageData...)
	if _, err := v.writer.Write(d); err != nil {
		return err
	}
	response, err := v.readBytes(1)
	if err != nil {
		return err
	}
	if response[0] != writeSuccess {
		return errors.New("Write failed")
	}
	return nil
}

//returns the page bytes for 4 pages starting from the index provided.
func (v *Client) ReadPages(startPageIndex int) ([]byte, error) {
	d := []byte{tagUartCmdReadPage, byte(startPageIndex), 0}
	if _, err := v.writer.Write(d); err != nil {
		return nil, err
	}
	return v.readBytes(tagNumPagesReturned * tagPageSize)
}

//disables the tag, the emulated reader will flush the buffer and won't process tag commands
func (v *Client) DisableTag() error {
	d := []byte{readerCmdDisable}
	if _, err := v.writer.Write(d); err != nil {
		return err
	}
	return nil
}

//enables the tag, emulated tag will response to commands sent by the reader
func (v *Client) EnableTag() error {
	d := []byte{readerCmdEnable}
	if _, err := v.writer.Write(d); err != nil {
		return err
	}
	return nil
}

//resets the stats to 0
//	in older firmware versions the "stats"
//	stats such last written page, last page read and last auth key used were reset when a new NTAG WUPA was received
//	in newer firmware version the stats are only reset back to 0 on request
func (v *Client) ResetStats() error {
	d := []byte{tagUartCmdResetStats}
	if _, err := v.writer.Write(d); err != nil {
		return err
	}
	return nil
}

//sets the enter bootloader flag the user may to manualy restart the device inorder for the bootloader to be loaded
func (v *Client) EnterUpgradeMode() error {
	d := []byte{readerCmdEnterBootloader}
	if _, err := v.writer.Write(d); err != nil {
		return err
	}
	return nil
}

//returns the firmware version and compile date info struct
func (v *Client) GetVersionInfo() (*VersionInfo, error) {
	d := []byte{readerCmdGetVersionInfo}
	if _, err := v.writer.Write(d); err != nil {
		return nil, err
	}
	buf := bufio.NewReader(v.reader)
	vi := VersionInfo{}

	var line []byte
	var err error

	line, err = buf.ReadBytes(byte(0))
	if err != nil {
		return nil, err
	}
	vi.versionstr = string(line)
	line, err = buf.ReadBytes(byte(0))
	if err != nil {
		return nil, err
	}
	vi.compileDateTime = string(line)

	return &vi, nil
}
