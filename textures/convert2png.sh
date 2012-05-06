for i in *.svg; do inkscape -z -e ${i%%.svg}.png -w 256 -h 256 $i; done
