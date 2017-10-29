#!/bin/bash
mkdir release 
outputName=""

for file in dist/*
do
 if [[ "$file" == *"win"* ]]; then
	new=${file:0:-4}
	new+=".zip"
	outputName="tagEmulatorClient.exe"
 else
	new=$file
	new+=".tar.gz"
	outputName="tagEmulatorClient"
 fi;
 cp $configFile release/config.json -f
 cp $file release/$outputName -f
 cd release/
 archiver make "../$new" $outputName
 cd ..
done;

mkdir packages
mv dist/*.zip dist/*.gz packages/