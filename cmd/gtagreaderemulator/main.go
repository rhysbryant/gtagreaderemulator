package main

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
	"flag"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/d2r2/go-i2c"
	"github.com/jacobsa/go-serial/serial"
	"github.com/rhysbryant/gtagreaderemulator"
	"github.com/rhysbryant/gtagreaderemulator/httpagent"
	"github.com/rhysbryant/gtagreaderemulator/i2ctagapi"
	"github.com/rhysbryant/gtagreaderemulator/i2cuarttagapi"
	"github.com/rhysbryant/gtagreaderemulator/uarttagapi"
	"github.com/rhysbryant/gtagreaderemulator/utils"
)

func printError(e error) {
	if e != nil {
		fmt.Fprintf(os.Stderr, "%s\n", e)
	}
}

func main() {
	var cmd, devicePath, filePath, connectionType string

	flag.StringVar(&cmd, "cmd", "", "command writeToFile, readFromFile")
	flag.StringVar(&devicePath, "readerPath", "", "the path to the serial/uart port")
	flag.StringVar(&filePath, "file", "", "the local file to read or write to/from when using the file commands")
	flag.StringVar(&connectionType, "connType", "uart", "the connection type uart, i2c for i2c over uart or locali2c")
	flag.Parse()

	if cmd == "" || devicePath == "" || filePath == "" {
		fmt.Println("all arguments are required")
		flag.Usage()
		return
	}

	// Set up options.
	options := serial.OpenOptions{
		PortName:          devicePath,
		BaudRate:          115200,
		DataBits:          8,
		StopBits:          1,
		MinimumReadSize:   1,
		RTSCTSFlowControl: false,
	}
	var client tagreaderemulator.TagReaderAPI
	var p io.ReadWriteCloser
	if connectionType == "locali2c" {
		i2c, err := i2c.NewI2C(0x28, 1)
		if err != nil {
			fmt.Printf("NewI2C: %v\n", err)
			return
		}		
		i2ctagapi.NewClient(i2c, 5000)
	} else {
		var err error
		// Open the port.
		p, err = serial.Open(options)
		if err != nil {
			fmt.Printf("serial.Open: %v\n", err)
			return
		}
	}

	time.Sleep(5000)

	if connectionType == "i2c" {
		c := i2cuarttagapi.NewClient(p, p, 5000)
		client = c

	} else {
		c := uarttagapi.NewClient(p, p, 5000)
		client = c

	}

	switch cmd {
	case "writeToFile":
		printError(utils.WritePagesToFile(client, filePath))
	case "readFromFile":
		if err := client.DisableTag(); err != nil {
			printError(err)
			return
		}

		printError(utils.WritePagesFromFile(client, filePath))

		if err := client.EnableTag(); err != nil {
			printError(err)
			return
		}
	case "starthttpagent":
		httpagent.TagConnection = client
		httpagent.Start(":8000")
	default:
		fmt.Println("unknown cmd")
		flag.Usage()
	}

}
