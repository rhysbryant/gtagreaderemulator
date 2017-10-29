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
	"bytes"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"time"
)

const (
	delayBetweenPageWrites = time.Millisecond * 10
)

func (v *Client) WriteAndVerify(pageIndex int, pageData []byte) error {
	if err := v.WritePage(pageIndex, pageData); err != nil {
		return err
	}
	data, err := v.ReadPages(pageIndex)
	if err != nil {
		return err
	}
	if !bytes.Equal(data[0:tagPageSize], pageData) {
		return errors.New("Verify of written page failed")
	}
	return nil
}

//writes data for the given pages expects data in the format of one page perline
func (v *Client) WritePagesFromHex(src io.Reader) error {
	buf := bufio.NewReader(src)
	i := 0
	for {
		line, isPrefix, err := buf.ReadLine()
		if err == io.EOF {
			break
		} else if err != nil {
			return err
		} else if isPrefix {
			return errors.New("Line too long")
		}

		if len(line) != 8 {
			return errors.New("unexpected line length")
		}
		pageBytes := [4]byte{}
		if _, err := hex.Decode(pageBytes[:], line); err != nil {
			return err
		}
		if i > 0 {
			//give the EEPROM time to finish the write
			time.Sleep(delayBetweenPageWrites)
		}
		if err := v.WriteAndVerify(i, pageBytes[:]); err != nil {
			return err
		}

		i++
	}

	return nil
}

//writes the contents of all the tag's pages to the destation interface as new line seperated hex data
func (v *Client) EncodeAllPagesToHex(dst io.Writer) error {
	numPages := 4
	for i := 0; i < 45; i += tagNumPagesReturned {
		pages, err := v.ReadPages(i)
		if err != nil {
			return err
		}

		if i == 44 {
			numPages = 1
		}

		for p := 0; p < numPages; p++ {
			pStartOffset := p * tagPageSize
			str := hex.EncodeToString(pages[pStartOffset : pStartOffset+tagPageSize])
			fmt.Fprintln(dst, str)
		}
	}

	return nil
}

//reads all the pages from the tag and writes them to the given file
func (v *Client) WritePagesToFile(fileName string) error {

	file, err := os.Create(fileName)
	if err != nil {
		return err
	}
	defer file.Close()
	return v.EncodeAllPagesToHex(file)
}

//writes all the pages to the tag reading from the given file
func (v *Client) WritePagesFromFile(fileName string) error {
	fmt.Println(fileName)
	file, err := os.Open(fileName)
	if err != nil {
		return err
	}
	defer file.Close()
	return v.WritePagesFromHex(file)
}
