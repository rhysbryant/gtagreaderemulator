package i2ctagapi

/**
 * @License LGPL
 * @Auther Rhys Bryant
 * @Copyright Rhys Bryant 2018
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
	"errors"
	"fmt"
	"time"

	"github.com/d2r2/go-i2c"
)

const (
	actionReadCode            = 1
	actionWriteCode           = 2
	tagCommandReadPages       = 0x30
	tagCommandWritePage       = 0xA2
	tagCommandResponseAck     = 0xA
	tagNumPagesPerRead        = 4
	tagNumBytesPerPage        = 4
	readerFIFOLevelReg        = 0x0A
	readerFIFOReg             = 0x09
	readerFrameingModeReg     = 0x0D
	readerFramingModeTransmit = 0x80
	readerFIFOClear           = 0x80
)

var (
	errorWriteFailed            = errors.New("Write failed")
	errorUnexpectedResponseSize = errors.New("the response size was unexpected")
	errorResponseTimeout        = errors.New("Wait for response timedout")
)

type Client struct {
	i2cConn *i2c.I2C
	timeout time.Duration
}

func NewClient(i2cConn *i2c.I2C, timeout time.Duration) *Client {
	return &Client{i2cConn, timeout * time.Millisecond}
}

func (c *Client) readRegister(id byte) (byte, error) {
	return c.i2cConn.ReadRegU8(id)
}

func (c *Client) writeRegister(id byte, val byte) error {
	return c.i2cConn.WriteRegU8(id, val)
}

func (c *Client) writeToBuffer(data ...byte) error {
	for _, d := range data {
		if err := c.writeRegister(readerFIFOReg, d); err != nil {
			return err
		}
	}
	return nil
}

func (c *Client) sendBufferToTag() error {
	return c.writeRegister(readerFrameingModeReg, readerFramingModeTransmit)
}

func (c *Client) clearBuffer() error {
	return c.writeRegister(readerFIFOLevelReg, readerFIFOClear)
}

func (c *Client) bufferLevel() (byte, error) {
	return c.readRegister(readerFIFOLevelReg)
}

func (c *Client) waitforData(minNumBytes int) (byte, error) {

	start := time.Now()
	for {
		FIFOLevel, err := c.bufferLevel()
		if err != nil {
			return 0, err
		}
		if FIFOLevel >= minNumBytes {
			return FIFOLevel, nil
		}

		time.Sleep(2 * time.Millisecond)
		if time.Since(start) > c.timeout {
			return 0, errorResponseTimeout
		}
	}
}

func (c *Client) WritePage(pageIndex int, pageData []byte) error {
	if err := c.clearBuffer(); err != nil {
		return err
	}

	if err := c.writeToBuffer(tagCommandWritePage, byte(pageIndex)); err != nil {
		return err
	}

	if err := c.writeToBuffer(pageData...); err != nil {
		return err
	}

	if err := c.sendBufferToTag(); err != nil {
		return err
	}

	_, err := c.waitforData(1)
	if err != nil {
		return err
	}

	v, err := c.readRegister(readerFIFOReg)
	if err != nil {
		return err
	}

	if v != tagCommandResponseAck {
		return errorWriteFailed
	}

	return nil
}

func (c *Client) ReadPages(startPageIndex int) ([]byte, error) {
	if startPageIndex >= 41 {
		//workriound bug in a emulator reading above 41 gets no response
		data := make([]byte, tagNumPagesPerRead*tagNumBytesPerPage)
		return data, nil
	}

	fmt.Printf("ReadPages index %d", startPageIndex)
	if err := c.clearBuffer(); err != nil {
		return nil, err
	}

	if err := c.writeToBuffer(tagCommandReadPages, byte(startPageIndex)); err != nil {
		return nil, err
	}

	if err := c.sendBufferToTag(); err != nil {
		return nil, err
	}

	numBytes, err := c.waitforData(tagNumPagesPerRead * tagNumBytesPerPage)
	if err != nil {
		return nil, err
	}

	if numBytes != (tagNumPagesPerRead * tagNumBytesPerPage) {
		return nil, errorUnexpectedResponseSize
	}

	data := make([]byte, numBytes)

	for i := 0; i < len(data); i++ {
		d, err := c.readRegister(readerFIFOReg)
		if err != nil {
			return nil, err
		}
		data[i] = d
	}

	return data, err
}

func (c *Client) DisableTag() error {
	return nil
}
func (c *Client) EnableTag() error {
	return nil
}
