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
	"os"
	"time"

	"github.com/rhysbryant/gtagreaderemulator"

	"github.com/tarm/serial"
)

func printError(e error) {
	if e != nil {
		fmt.Fprintf(os.Stderr, "%s\n", e)
	}
}

func main() {
	var cmd, devicePath, filePath string

	flag.StringVar(&cmd, "cmd", "", "command writeToFile, readFromFile")
	flag.StringVar(&devicePath, "readerPath", "", "the path to the serial/uart port")
	flag.StringVar(&filePath, "file", "", "the local file to read or write to/from when using the file commands")
	flag.Parse()

	if cmd == "" || devicePath == "" || filePath == "" {
		fmt.Println("all arguments are required")
		flag.Usage()
		return
	}

	c := serial.Config{}
	c.Name = devicePath
	c.Baud = 115200
	c.ReadTimeout = time.Millisecond * 500

	p, err := serial.OpenPort(&c)
	if err != nil {
		fmt.Print(err)
		return
	}
	client := tagreaderemulator.NewClient(p, p, 500)
	v, err := client.GetVersionInfo()
	if err != nil {
		printError(err)
		return
	}
	fmt.Printf("Emulator Firmware Version Info: %s\n", v)

	switch cmd {
	case "writeToFile":
		printError(client.WritePagesToFile(filePath))
	case "readFromFile":
		if err := client.DisableTag(); err != nil {
			printError(err)
			return
		}

		printError(client.WritePagesFromFile(filePath))

		if err := client.EnableTag(); err != nil {
			printError(err)
			return
		}
	default:
		fmt.Println("unknown cmd")
		flag.Usage()
	}

}
