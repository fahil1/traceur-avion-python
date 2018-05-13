/*
    Iliass Fahmi (fah.iliass@gmail.com)
*/

var map = null;
var ws = null;
var nodes_layers = [];
const receiver_position = [-7.6368736, 33.4783407];
const socket_port = 32000



function initMap() {
    var OSM_layer = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    map = new ol.Map({
        target: 'carte',
        layers: [OSM_layer]
    });

    map.getView().animate({center: ol.proj.fromLonLat(receiver_position), zoom: 7});
    
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

            style.getImage().setRotation(aircraft.heading * 0.0174533);

            var source = new ol.source.Vector({
                features: [feature]
            });

            var layer = new ol.layer.Vector({
                source: source,
                style: style
            });

            nodes_layers.push(layer);
            map.addLayer(layer);
        }
    });
}

function clearMap() {
    nodes_layers.forEach(element => {
        map.removeLayer(element)
    });
}

$(document).ready(function() {
    initMap();
    initSocket();
});

