for i in *.svg; do inkscape -z -e ${i%%.svg}.png -w 128 -h 128 $i; done
