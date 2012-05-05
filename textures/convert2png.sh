for i in *.svg; do inkscape -z -e ${i%%.svg}.png -w 512 -h 512 $i; done
