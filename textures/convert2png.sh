for i in *.svg; do inkscape -z -e ${i%%.svg}.png -d 1200 $i; done
