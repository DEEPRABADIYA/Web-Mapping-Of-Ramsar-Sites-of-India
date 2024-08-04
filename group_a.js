// Define a style function that returns a style based on the level
function styleFunction(feature) {
    const level = feature.get('Class'); // Assuming the level is stored in a property called 'level'
    let style;
    switch (level) {
        case 'State-level':
            style = new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 5,
                    fill: new ol.style.Fill({
                        color: 'blue',
                    }),
                }),
            });
            break;
        case 'National-level':
            style = new ol.style.Style({
                image: new ol.style.RegularShape({
                    fill: new ol.style.Fill({
                        color: 'red',
                    }),
                    points: 4, // This will create a square shape
                    radius: 6,
                    angle: Math.PI / 4, // This will align the square with the map
                }),
            });
            break;
    }
    return style;
}

const wmsURL = 'http://localhost:8080/geoserver/group_a/wms/'
const ramsar = 'group_a:ramsar_sites'

var osmLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
});

var googleLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: ' Google'
    }),
    visible: false
});

var map = new ol.Map({
    target: 'map',
    layers: [osmLayer],
    view: new ol.View({
        center: [80.73205630467105, 23.013921409938625],
        projection: 'EPSG:4326',
        zoom: 5
    })
});

// Create a vector layer with the style function
const geoServerLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: wmsURL + '?service=WFS&version=1.0.0&request=GetFeature&typeName=' + ramsar + '&outputFormat=application/json',
        format: new ol.format.GeoJSON()
    }),
    style: styleFunction,
});
map.addLayer(googleLayer);
map.addLayer(geoServerLayer);


// Add event listener for singleclick event
map.on('singleclick', function (evt) {
    // Get the feature info URL
    var url = geoServerLayer.getSource().getFeatureInfoUrl(
        evt.coordinate,
        map.getView().getResolution(),
        'EPSG:4326', { 'INFO_FORMAT': 'application/json' }
    );
    console.log(url);
    if (url) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const features = data.features;
                const table = document.getElementById('attributeTable');
                features.forEach(feature => {
                    const row = table.insertRow();
                    const cell1 = row.insertCell(0);
                    const cell2 = row.insertCell(1);
                    cell1.innerHTML = feature.properties.site_name;
                    cell2.innerHTML = feature.properties.region;
                });
            })
            .catch(error => console.error('Error fetching data:', error));
    }
});

// Event listener for radio buttons of Basemap
const basemap_radios = document.querySelectorAll('.radio-item input[type="radio"]');
basemap_radios.forEach((radio) => {
    radio.addEventListener('change', function () {
        const layerName = radio.value;
        // Hide all layers initially
        osmLayer.setVisible(false);
        googleLayer.setVisible(false);

        switch (layerName) {
            case 'google':
                googleLayer.setVisible(true);
                break;
            case 'osm':
                osmLayer.setVisible(true);
                break;
        }
    });
});

// Set the OSM radio button as default
const osmRadio = document.querySelector('.radio-item input[value="osm"]');
osmRadio.checked = true;
// Make OSM layer visible by default
osmLayer.setVisible(true);


// For filter
var originalFeaturesStates = ["Andhra Pradesh", "Assam", "Bihar", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Mizoram", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
var originalFeatures = ['State-level', 'National-level'];

// Assuming geoServerLayer is already defined and populated
geoServerLayer.getSource().once('change', function() {
    originalFeatures = geoServerLayer.getSource().getFeatures();
    originalFeaturesStates = geoServerLayer.getSource().getFeatures();
});

// Get the select elements
var stateSelect = document.getElementById('stateSelect');
var filterSelect = document.getElementById('filterSelect');

// Function to update the layer based on selected filters
function updateLayer() {
    // Get selected values
    var selectedState = stateSelect.value;
    var selectedFilter = filterSelect.value;

    // Filter original features based on selected state
    var filteredByState = originalFeaturesStates.filter(function (feature) {
        var state = feature.get('State');
        return selectedState === "SELECT STATE" || state === selectedState;
    });

    // Further filter the already filtered features based on selected level
    var finalFilteredFeatures = filteredByState.filter(function (feature) {
        var level = feature.get('Class');
        return selectedFilter === "SELECT LEVEL" || level === selectedFilter;
    });

    // Clear the current features in the layer and add the final filtered features
    geoServerLayer.getSource().clear();
    geoServerLayer.getSource().addFeatures(finalFilteredFeatures);
}

// Add event listeners to both select elements
stateSelect.addEventListener('change', updateLayer);
filterSelect.addEventListener('change', updateLayer);



// Elements that make up the popup.
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

// Create an overlay to anchor the popup to the map.
const overlay = new ol.Overlay({
  element: container,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
  offset: [0, -20], // adjust the offset to position the popup above the point
});

// Add a close button to the popup
const closeButton = document.createElement('button');
closeButton.textContent = 'X';
closeButton.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};
container.appendChild(closeButton);

map.addOverlay(overlay); // Add the overlay to the map

map.on('click', (event) => {
//   const coordinate = event.coordinate;
  const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => {
    if (feature && feature.get('geometry').getType() === 'Point') {
      const properties = feature.getProperties();
      const name = properties['Site_name'];
      const state = properties['State'];
      const classType = properties['Class'];
      const link = properties['link'];
      const area= properties['Area__ha_'];

      const popupContent = `
        <table>
          <tr>
            <th>Name:</th>
            <td>${name}</td>
          </tr>
          <tr>
            <th>State:</th>
            <td>${state}</td>
          </tr>
          <tr>
            <th>Class:</th>
            <td>${classType}</td>
          </tr>
          <tr>
            <th>Link:</th>
            <td><a href="${link}" target="_blank">View More</a></td>
          </tr>
          <tr>
            <th>Site Area(ha):</th>
            <td>${area}</td>
          </tr>
          <tr>
        </table>

      `;

      content.innerHTML = popupContent;
      overlay.setPosition(event.coordinate);
    }
  });
});