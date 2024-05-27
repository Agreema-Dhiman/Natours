/*eslint-disable*/
//javascript file to integrate html on client side
//FRONT END CODE

//One way is to do ajax request and get data from API side

export const displayMap = (locations) => {
  maptilersdk.config.apiKey = '2nWkBZZEg7xLpSVgGXV1';
  var map = new maptilersdk.Map({
    container: 'map', // container's id or the HTML element in which the SDK will render the map
    style: 'bright-v2-pastel',
    scrollZoom: false,
    //   center: [-118.113491, 34.111745], // starting position [lng, lat]
    //   zoom: 10, // starting zoom
    //   interactive: false,
  });

  const bounds = new maptilersdk.LngLatBounds();

  locations.forEach((loc) => {
    const ele = document.createElement('div');
    ele.className = 'marker';
    new maptilersdk.Marker({
      element: ele,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);
    // Add popup
    new maptilersdk.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.on('load', () => {
    map.fitBounds(bounds, {
      padding: {
        top: 200,
        bottom: 150,
        left: 100,
        right: 100,
      },
    });
  });
};
