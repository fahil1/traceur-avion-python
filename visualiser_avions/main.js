$(document).ready(function() {
    run();
});

coucheAvions = "";

var carte = null;
var ws;

var source_1 = null;

function run() {
    var coucheOSM = new ol.layer.Tile({
        source: new ol.source.OSM()
    });


    ws = new WebSocket("ws://localhost:32000/");
    // Set event handlers.
    ws.onopen = function() {
    output("onopen");
    };
    
    ws.onmessage = function(e) {
    // e.data contains received string.
    var tab = JSON.parse(e.data)
    output(e.data);
    if(source_1 != null) {
        source_1.clear();
    }
    var coords = null
    tab.forEach(element => {
        if(source_1 != null && element.latitude != null && element.longitude != null && element.heading != null) {
            coords = ol.proj.fromLonLat([element.longitude, element.latitude]);
            var geom = new ol.geom.Point(coords);
            var feature = new ol.Feature(geom);
            feature.setStyle(new ol.style.Style({
                image: new ol.style.Icon({
                    src: 'noeud.png'
                })
            }));

            feature.getStyle().getImage().setRotation(1.57);
            source_1.addFeature(feature);
            
        }
    });
    source_1.refresh();
    carte.getView().fit(source_1.getExtent());
    };
    
    ws.onclose = function() {
    output("onclose");
    };
    ws.onerror = function(e) {
    output("onerror");
    console.log(e)
    };

    source_1 = new ol.source.Vector({

    });
    vecteur_1 = new ol.layer.Vector({
        source: source_1,
        style: new ol.style.Style({
            image: new ol.style.Icon({
                src: 'noeud.png'
            })
        })
    });


    carte = new ol.Map({
        target: 'carte',
        layers: [coucheOSM,vecteur_1]
    });

    navigator.geolocation.getCurrentPosition(function(pos) {
        const coords = ol.proj.fromLonLat([pos.coords.longitude, pos.coords.latitude]);
        //source_1.addFeature(new ol.Feature(new ol.geom.Point(coords)));
        carte.getView().animate({center: coords, zoom: 10});
    });
}


function output(str) {
    var log = document.getElementById("journal");
    var escaped = str.replace(/&/, "&amp;").replace(/</, "&lt;").
      replace(/>/, "&gt;").replace(/"/, "&quot;"); // "
    log.innerHTML = escaped + "<br>"; //+ log.innerHTML;
  }