import json
import threading
import time
import random
from websocket_server import WebsocketServer

server = None
def run_ws():
    global server
    server = WebsocketServer(32000)
    server.run_forever()


ws = threading.Thread(target=run_ws)
ws.start()

time.sleep(3)
file = open('dump_lat_lon.txt', 'r')
while True:
    for line in file:
        server.send_message_to_all(line)
        time.sleep(random.randrange(50, 500, 50) / 1000)
        print('SENT: ' + line)
    file.seek(0)