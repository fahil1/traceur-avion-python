/*
    Iliass Fahmi (fah.iliass@gmail.com)
*/

var map = null;
var ws = null;
var nodes_layers = [];
const receiver_position = [-7.6368736, 33.4783407];
const antennaPosition = [-9.634478, 30.43599];
const socket_port = 32000

var source = new ol.source.Vector({
});

var layer = new ol.layer.Vector({
    source: source,
});

function ajouterAntenne() {
    const style = new ol.style.Style({
        image: new ol.style.Icon({
          src: 'antenna.png'
        }),
        text: new ol.style.Text({
          text: 'antenne',
          fill: new ol.style.Fill({
              color: '#00FF00'
          }),
          stroke: new ol.style.Stroke({
              color: '#000000',
              width: 3
          }),
          offsetY: 18,
      })
      });
  
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat(antennaPosition))
      });
      feature.setStyle(style);
      this.antenna = new ol.layer.Vector({
        source: new ol.source.Vector({
          features: [feature]
        })
      });
      map.addLayer(this.antenna);
}

function initSector() {
    const points = [
        {name: 'KONBA', position: [-15.30167, 31.30083]}, // OK
        {name: 'LEPRU', position: [-14.80111, 32]}, // ok
        {name: 'OSDIV', position: [-13.83611, 33.14944]}, // ok
        {name: 'SAMAR', position: [-14.41556, 30.89972]}, // ok
        {name: 'MITLA', position: [-14.08222, 31.30833]}, // ok
        {name: 'ABTIR', position: [-12.80167, 32.84889]}, // ok
        {name: 'NEVTU', position: [-13.24472, 32.97861]}, // ok
        {name: 'TERTO', position: [-12.71722, 30.10417]},
        {name: 'ERMED', position: [-10.13639, 33.01528]}
      ];
      const features = [];
      points.forEach((poi, index) => {
        const style = new ol.style.Style({
          image: new ol.style.Icon({
            src: 'marker.png'
          }),
          text: new ol.style.Text({
            text: poi.name,
            fill: new ol.style.Fill({
                color: '#00FF00'
            }),
            stroke: new ol.style.Stroke({
                color: '#000000',
                width: 3
            }),
            offsetY: 18,
        })
        });
        const feature = new ol.Feature({
          geometry: new ol.geom.Point(ol.proj.fromLonLat(poi.position)),
          name: poi.name,
        });
        feature.setStyle(style);
        features.push(feature);
      });
      layer2 = new ol.layer.Vector({
        source: new ol.source.Vector({
          features: features
        })
      });
      this.map.addLayer(layer2);
}


function initMap() {
    var OSM_layer = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    // OSM_layer = new ol.layer.Tile({
    //     source: new ol.source.BingMaps({
    //         key: 'Aj_lt5oGlcTzENwKBowFxOxF8JwHR8eaxf66ufX0WfSYs8rGrny5JfIv0Cp1ODT4'
    //       })
    // })

    map = new ol.Map({
        target: 'carte',
        layers: [OSM_layer]
    });

    map.getView().animate({center: ol.proj.fromLonLat(antennaPosition), zoom: 7});
    map.addLayer(layer);
}

function initSocket() {
    ws = new WebSocket("ws://localhost:" + socket_port + "/");

    ws.onopen = function() {
        output("connected!");
    };

    ws.onclose = function() {
        output("connection closed.");
    };

    ws.onerror = function(e) {
        output("ERROR!: See Console.");
        console.log(e)
    };

    ws.onmessage = handleAircrafts;
}

function output(str) {
    $("#journal").html(str);
}

function handleAircrafts(e) {
    var array = JSON.parse(e.data);
    output(e.data);
    clearMap();

    array.forEach(aircraft => {
        if(aircraft.latitude != null && aircraft.heading != null) {
            var point = new ol.geom.Point(ol.proj.fromLonLat([aircraft.longitude, aircraft.latitude]));

            var feature = new ol.Feature(point);

            var style = new ol.style.Style({
                image: new ol.style.Icon({
                    src: 'noeud.png'
                })
            });

            var call_sign = aircraft.call_sign != null ? aircraft.call_sign.replace(/_/g,'') : '?';
            var speed = aircraft.speed != null ? aircraft.speed : '?';
            var altitude = aircraft.altitude != null ? aircraft.altitude : '?';
            var text = new ol.style.Text({
                text: call_sign + " " + speed + 'km/h@' + altitude + 'm',
                fill: new ol.style.Fill({
                    color: '#00FF00'
                }),
                stroke: new ol.style.Stroke({
                    color: '#000000',
                    width: 3
                }),
                offsetY: 18,
            });
            style.setText(text);

            style.getImage().setRotation(aircraft.heading * 0.0174533);
            feature.setStyle(style);
            source.addFeature(feature);
        }
    });
}

function clearMap() {
    // nodes_layers.forEach(element => {
    //     map.removeLayer(element)
    // });
    source.clear()
}

$(document).ready(function() {
    initMap();
    initSocket();
    ajouterAntenne();
    initSector();
});

