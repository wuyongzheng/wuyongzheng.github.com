#!/bin/bash

sed -n '1,/^var numbers = ..;$/p' days.template.html | head -n -1
echo "var numbers = ["
sed -e 's/"/\\"/g' -e 's/^\(.*\)\t\(.*\)$/\t\1, "\2",/' numbers.txt
echo "];"
sed -n '/^var numbers = ..;$/,$p' days.template.html | tail -n +2
