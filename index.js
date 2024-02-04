import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import rawData from './gundata.json';
import apiKey from './config';

let mapBounds;


window.initMap = () => {

    const mapOptions = {
        center: {lat: 38.0, lng: -97.0},
        zoom: 4.5,
        styles: [
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#a0b4f4" }],
            },
        ],
    };

    const map = new google.maps.Map(document.getElementById('map'), mapOptions);
    
    // Listen for the 'idle' event to update the map bounds
    google.maps.event.addListenerOnce(map, 'idle', function () {
    // Set the initial bounds after the map becomes idle
    mapBounds = map.getBounds();
    });


    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        panel: document.getElementById('directionsPanel'),
    });

    document.getElementById('submit').addEventListener('click', function () {
        calculateAndDisplayRoute(directionsService, directionsRenderer);
    });

    const overlay = new GoogleMapsOverlay({
        layers: [
            scatterplot()//,
            //heatmap()
        ],
    });
    overlay.setMap(map);

}

const sourceData = './gundata.json';

const scatterplot = () => new ScatterplotLayer({
    id: 'scatter',
    data: sourceData,
    opacity: 0.8,
    filled: true,
    radiusMinPixels: 15,
    radiusMaxPixels: 16,
    getPosition: d => [d.longitude, d.latitude],
    getFillColor: d => d.n_killed > 0 ? [200, 0, 40, 150] : [255, 140, 0, 100],
    pickable: true,
    onClick: ({object, x, y}) => {
        window.open(`https://www.gunviolencearchive.org/incident/${object.incident_id}`)
      },
  });

const heatmap = () => new HeatmapLayer({
    id: 'heat',
    data: sourceData,
    getPosition: d => [d.longitude, d.latitude],
    getWeight: d => d.n_killed + (d.n_injured * 0.5),
    radiusPixels: 60,
});


function calculateAndDisplayRoute(directionsService, directionsRenderer) {
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;

    directionsService.route(
        {
            origin: origin,
            destination: destination,
            travelMode: 'WALKING',
            provideRouteAlternatives: true, // Request multiple alternative routes
        },
        function (response, status) {
            if (status === 'OK') {

                // Display each route on the map
                for (var i = 0; i < response.routes.length; i++) {
                    new google.maps.DirectionsRenderer({
                        map: map,
                        directions: response,
                        routeIndex: i,
                    });
                    
                    const interval = 25; // interval of point draw in meters;
                    console.log(" ROUTE   " + i + "  ------------");
                    const route_dist = samplePointsAlongRoute(response.routes[i], interval);
                }
                // Set the directions for the first route in the response
                directionsRenderer.setDirections(response);
            } else {
                window.alert('Directions request failed due to ' + status);
            }
        }
    );
}

// Function to check if a point is within the current map bounds
function isPointInBounds(lat, long, bounds) {

    const latLng = new google.maps.LatLng(lat, long);
    return bounds.contains(latLng);
  }

// Function to update the map bounds when the map becomes idle
function updateMapBounds() {
    mapBounds = map.getBounds();
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Radius of the Earth in kilometers
    const R = 6371;

    // Convert latitude and longitude from degrees to radians
    const radLat1 = (lat1 * Math.PI) / 180;
    const radLon1 = (lon1 * Math.PI) / 180;
    const radLat2 = (lat2 * Math.PI) / 180;
    const radLon2 = (lon2 * Math.PI) / 180;

    // Calculate differences in coordinates
    const dLat = radLat2 - radLat1;
    const dLon = radLon2 - radLon1;

    // Haversine formula to calculate distance
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}




function samplePointsAlongRoute(route, interval) {

    // Filtering crimes to all points within a 10 kilometer radius of route
    const start =  route.legs[0].start_location;
    const end =  route.legs[route.legs.length - 1].end_location;

    const midPoint_lat = (start.lat() + end.lat())/2;
    const midPoint_lng = (start.lng() + end.lng())/2;

    const radius = 10; // radius in kilometers, initial calc.

    const visibleData = rawData.filter(point => calculateDistance(point.latitude, point.longitude, midPoint_lat, midPoint_lng) <= radius);

    var total_sum = 0;
    const near_radius = 1; // kilometer radius per point

    var total_points = 0;
    // Iterate through each leg in the route
    route.legs.forEach(leg => {
        // Iterate through each step in the leg
        leg.steps.forEach(step => {
            const sampledPoints = [];

            const startLatLng = step.start_location;
            const endLatLng = step.end_location;

            // Calculate the distance between start and end locations
            const totalDistance = google.maps.geometry.spherical.computeDistanceBetween(
                startLatLng,
                endLatLng
            );

            // Calculate the number of points to sample based on the interval
            const numPoints = Math.floor(totalDistance / interval);

            // Sample points and add to the result array
            for (let i = 0; i <= numPoints; i++) {
                const fraction = i / numPoints;
                const interpolatedLatLng = google.maps.geometry.spherical.interpolate(
                    startLatLng,
                    endLatLng,
                    fraction
                );
                sampledPoints.push(interpolatedLatLng);
            }

            //console.log(sampledPoints);
            
            sampledPoints.forEach(point => {
                total_points += 1;
                //console.log(point);
                // Retrieve latitude and longitude of the interpolated point
                const latitude = point.lat();
                const longitude = point.lng();

                const near_crimes = visibleData.filter(crime => calculateDistance(latitude, longitude, crime.latitude, crime.longitude) <= near_radius);
                //console.log(" near crimes for step " + j + " :" + near_crimes);

                for (var k = 0; k < near_crimes.length; k++) {
                    //console.log(near_crimes[k].latitude + " " + near_crimes[k].longitude);
                    total_sum += (near_radius - calculateDistance(latitude, longitude, near_crimes[k].latitude, near_crimes[k].longitude));
                }
            });


        });
    });
    const avg_dist = (total_sum / total_points);
    console.log(" AVG ROUTE DIST " + avg_dist);

    return avg_dist;
}