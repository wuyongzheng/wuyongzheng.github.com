#!/bin/bash

sed -n '1,/^var thenumbers = ..;$/p' days.template.html | head -n -1 >days.html
echo "var thenumbers = [" >>days.html
sed -e 's/"/\\"/g' -e 's/^\(.*\)\t\(.*\)$/\t\1, "\2",/' numbers.txt >>days.html
echo "];" >>days.html
sed -n '/^var thenumbers = ..;$/,$p' days.template.html | tail -n +2 >>days.html
