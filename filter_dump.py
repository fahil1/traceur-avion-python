import json
from pprint import pprint


file = open('dump.txt', 'r')
file2 = open('dump_lat_lon.txt', 'w')
for line in file:
    aircrafts = json.loads(line)
    position = True
    for aircraft in aircrafts:
        if aircraft['longitude'] is None or aircraft['latitude'] is None or aircraft['heading'] is None:
            position = False
    if position:
        file2.write(line)
        file2.flush()