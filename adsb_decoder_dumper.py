import pyModeS as pms
import time
import copy
import socket
import json
import os
import threading
from websocket_server import WebsocketServer


current_aircraft_dict = {}
positions = {}
server = None
file_dump = open("dump.txt", "a")


def db_json():
    global current_aircraft_dict
    json = '[]'
    if len(current_aircraft_dict) > 0:
        json = '['
        for a in current_aircraft_dict:
            aircraft = current_aircraft_dict[a]
            json += aircraft._to_json() + ','
        json = json[:len(json)-1] + ']'
    return json

class Aircraft:
    def __init__(self):
        self.icao = None
        self.altitude = None
        self.call_sign = None
        self.latitude = None
        self.longitude = None
        self.speed = None
        self.heading = None
        self.vertical_rate = None
        self.last_seen = None
    
    def _display(self):
        atts = [a for a in dir(self) if not a.startswith('_') and getattr(self, a) is not None and a is not 'icao' and a is not 'last_seen']
        print('ICAO : {} - Last seen : {}s'.format(self.icao, int(time.time() - self.last_seen)))
        for a in atts:
            print('\t{} -> {}'.format(a, getattr(self,a)))
        print('\n')

    def _to_json(self):
        return json.dumps(self.__dict__)

class AdsbDecoder :
    def __init__(self, dump1090_address, dump1090_port,lat_ref=None, lng_ref=None):
        self.dump1090_address = dump1090_address
        self.dump1090_port = dump1090_port
        self.lat_ref = lat_ref
        self.lng_ref = lng_ref
    
    def decode(self, msg):
        ts = time.time()
        hex_msg = ((msg.decode('ascii'))[1:]).split(';')[0]
        aircraft = Aircraft()
        aircraft.last_seen = ts
        if '1' in pms.crc(hex_msg) or not ( ( pms.df(hex_msg) == 17 ) or ( pms.df(hex_msg) == 18 ) ):
            return aircraft
        self.decode_adsb(aircraft, hex_msg)


        return aircraft
        
        

    def decode_adsb(self, aircraft, hex_msg):
        # ICAO
        aircraft.icao = pms.adsb.icao(hex_msg)

        # Callsign
        if pms.adsb.typecode(hex_msg) in range(1,5):
            aircraft.call_sign = pms.adsb.callsign(hex_msg)

        # Position
        if ( pms.adsb.typecode(hex_msg) in range(5,9) ) or ( pms.adsb.typecode(hex_msg) in range(9,19) ) or ( pms.adsb.typecode(hex_msg) in range(20,23) ):
            aircraft.altitude = round(pms.adsb.altitude(hex_msg)*0.3048,2)
            position = self.calc_lat_long3(hex_msg,aircraft.last_seen)
            aircraft.latitude = position[0]
            aircraft.longitude = position[1]

        # Speed & Heading
        if pms.adsb.typecode(hex_msg) == 19:
            res = pms.adsb.velocity(hex_msg)
            aircraft.speed = round(res[0]*1.85, 2)
            aircraft.heading = int(round(res[1]))
            aircraft.vertical_rate = round(res[2] * 0.3048,2)     
        return aircraft

    def calc_lat_long3(self,msg,ts):
        # 1
        icao = pms.adsb.icao(msg)
        oe = pms.adsb.oe_flag(msg)
        oe_inv = 0 if oe == 1 else 1

        key = str(oe) + ";" + icao
        inv_key = str(oe_inv) + ";" + icao
        position = [None, None]


        if inv_key in positions:
            msg_even = positions[inv_key][0] if oe_inv == 0 else msg
            ts_even = positions[inv_key][1] if oe_inv == 0 else ts

            msg_odd = positions[inv_key][0] if oe_inv == 1 else msg
            ts_odd = positions[inv_key][1] if oe_inv == 1 else ts
            position = pms.adsb.position(msg_even, msg_odd, ts_even, ts_odd,lat_ref=self.lat_ref, lon_ref=self.lng_ref)
            if position is None:
                position = [None, None]
        positions[key] = [msg,ts]
        return position            

    # def calc_lat_long2(self,msg):
    #     return pms.adsb.position_with_ref(msg, self.ref_lat, self.ref_lng)
    def persist(self, new_aircraft):
        global current_aircraft_dict
        global server
        if new_aircraft.icao is None:
            return
        else:
            if new_aircraft.icao not in current_aircraft_dict:
                current_aircraft_dict[new_aircraft.icao] = copy.copy(new_aircraft)
            else:
                ref_aircraft = current_aircraft_dict[new_aircraft.icao]
                to_update = [a for a in dir(new_aircraft) if not a.startswith('_') and getattr(new_aircraft,a) is not None]
                for attr in to_update:
                    setattr(ref_aircraft, attr, getattr(new_aircraft,attr))
            json_dump = db_json()
            if server:
                server.send_message_to_all(json_dump)
                file_dump.write(json_dump + "\n")
                file_dump.flush()
        

    def run(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM) 
        self.socket.connect((self.dump1090_address, self.dump1090_port))
        print('Connecting..')
        while True:
            msg = self.socket.recv(1024)
            aircraft = self.decode(msg)
            self.persist(aircraft)

class AdsbDBManager(threading.Thread):

    def __init__(self, timeout=60):
        threading.Thread.__init__(self)
        self.timeout = timeout

    def vaccum(self):
        global current_aircraft_dict
        to_del = []
        if len(current_aircraft_dict) > 0:
            for key in current_aircraft_dict:
                aircraft = current_aircraft_dict[key]
                diff = time.time() - aircraft.last_seen
                if diff > self.timeout:
                    to_del.append(aircraft.icao)
        for x in to_del:
            del current_aircraft_dict[x]
        server.send_message_to_all(db_json())
        

    def show_db(self):
        global current_aircraft_dict
        print("Aircraft DB {}: \n-------------------------".format(len(current_aircraft_dict)))
        for a in list(current_aircraft_dict):
            aircraft = current_aircraft_dict[a]
            aircraft._display()

    def run(self):
        global current_aircraft_dict
        while True:        
            os.system('cls')
            self.vaccum()
            self.show_db()
            time.sleep(1)
            


def run_ws():
    global server
    server = WebsocketServer(32000)
    server.run_forever()

if __name__ == '__main__':
    # Gestionnaire de la BD (Auxilliary Thread)
    DBManager = AdsbDBManager(10)
    DBManager.start()

    # Server WebSocket (Auxilliary Thread)
    ws = threading.Thread(target=run_ws)
    ws.start()
        
    # Décodeur ADSB (Main Thread)
    decoder = AdsbDecoder("127.0.0.1", 30002)
    decoder.run()
    
