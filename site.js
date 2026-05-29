const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const revealItems = document.querySelectorAll(".reveal");
const fareAirport = document.querySelector("#fareAirport");
const farePickup = document.querySelector("#farePickup");
const fareDropoff = document.querySelector("#fareDropoff");
const farePickupSuggestions = document.querySelector("#farePickupSuggestions");
const fareDropoffSuggestions = document.querySelector("#fareDropoffSuggestions");
const fareVehicle = document.querySelector("#fareVehicle");
const fareReturn = document.querySelector("#fareReturn");
const fareCalculate = document.querySelector("#fareCalculate");
const fareTotal = document.querySelector("#fareTotal");
const fareVehicleLabel = document.querySelector("#fareVehicleLabel");
const fareDistanceLabel = document.querySelector("#fareDistanceLabel");
const fareDurationLabel = document.querySelector("#fareDurationLabel");
const fareRateLabel = document.querySelector("#fareRateLabel");
const fareStatus = document.querySelector("#fareStatus");
const fareMap = document.querySelector("#fareMap");
const fareMapMessage = document.querySelector("#fareMapMessage");
const fareEstimateField = document.querySelector("#fareEstimateField");
const fareAddToEnquiry = document.querySelector("#fareAddToEnquiry");
const journeyField = document.querySelector("textarea[name='journey']");
const geoapifyApiKey = window.FCC_GEOAPIFY_API_KEY || "";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0
});
const estimateRangePercent = 0.08;

const fareRates = {
  "e-class-four": {
    label: "Mercedes E-Class (4)",
    firstMile: 6,
    perMile: 2.2,
    minimum: 10
  },
  "s-class-four": {
    label: "Mercedes S-Class (4)",
    firstMile: 8,
    perMile: 2.6,
    minimum: 15
  },
  "v-class-seven": {
    label: "Mercedes V-Class (7)",
    firstMile: 10,
    perMile: 3,
    minimum: 20
  }
};

const northamptonPlace = {
  formatted: "Northampton NN1-NN5",
  lat: 52.2405,
  lon: -0.9027
};

const airportRates = {
  luton: {
    label: "London Luton (LTN)",
    place: {
      formatted: "London Luton Airport (LTN)",
      lat: 51.8747,
      lon: -0.3683
    },
    rates: {
      "e-class-four": 115,
      "s-class-four": 115,
      "v-class-seven": 130
    }
  },
  birmingham: {
    label: "Birmingham (BHX)",
    place: {
      formatted: "Birmingham Airport (BHX)",
      lat: 52.4539,
      lon: -1.748
    },
    rates: {
      "e-class-four": 120,
      "s-class-four": 120,
      "v-class-seven": 140
    }
  },
  heathrow: {
    label: "London Heathrow (HTR)",
    place: {
      formatted: "London Heathrow Airport (HTR)",
      lat: 51.47,
      lon: -0.4543
    },
    rates: {
      "e-class-four": 170,
      "s-class-four": 170,
      "v-class-seven": 210
    }
  },
  "east-midlands": {
    label: "East Midlands (EMA)",
    place: {
      formatted: "East Midlands Airport (EMA)",
      lat: 52.8311,
      lon: -1.3281
    },
    rates: {
      "e-class-four": 140,
      "s-class-four": 140,
      "v-class-seven": 160
    }
  },
  stansted: {
    label: "London Stansted (STN)",
    place: {
      formatted: "London Stansted Airport (STN)",
      lat: 51.885,
      lon: 0.235
    },
    rates: {
      "e-class-four": 190,
      "s-class-four": 190,
      "v-class-seven": 250
    }
  },
  gatwick: {
    label: "London Gatwick (LGW)",
    place: {
      formatted: "London Gatwick Airport (LGW)",
      lat: 51.1537,
      lon: -0.1821
    },
    rates: {
      "e-class-four": 250,
      "s-class-four": 250,
      "v-class-seven": 280
    }
  }
};

let map;
let routeLayer;
let pickupMarker;
let dropoffMarker;
let routeDetails = null;
let latestFareSummary = "";
let selectedAirportKey = "";
let routeRequestId = 0;

const selectedPlaces = {
  pickup: null,
  dropoff: null
};

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const formatDistance = (meters) => {
  const miles = meters / 1609.344;
  const precision = miles >= 10 ? 0 : 1;

  return `${miles.toFixed(precision)} miles`;
};

const formatDuration = (seconds) => {
  const minutes = Math.max(Math.round(seconds / 60), 1);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes} mins`;
  }

  return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} mins`;
};

const getRouteMetric = (properties, metric) => {
  if (typeof properties[metric] === "number") {
    return properties[metric];
  }

  return (properties.legs || []).reduce((total, leg) => total + (Number(leg[metric]) || 0), 0);
};

const setFareStatus = (message) => {
  if (fareStatus) {
    fareStatus.textContent = message;
  }
};

const hasGeoapifyKey = () => Boolean(geoapifyApiKey && geoapifyApiKey !== "YOUR_GEOAPIFY_API_KEY");

const getFareEstimate = () => {
  const rate = fareRates[fareVehicle.value];
  const airportFare = routeDetails.airportRates ? routeDetails.airportRates[fareVehicle.value] : null;
  const distanceMiles = routeDetails.distanceMeters / 1609.344;
  const mileageFare = rate.firstMile + (Math.max(distanceMiles - 1, 0) * rate.perMile);
  const singleFare = airportFare || Math.max(rate.minimum, mileageFare);
  const returnMultiplier = fareReturn.checked ? 2 : 1;
  const estimatedFare = singleFare * returnMultiplier;
  const low = Math.round(estimatedFare * (1 - estimateRangePercent));
  const high = Math.round(estimatedFare * (1 + estimateRangePercent));

  return {
    rate,
    range: low === high ? currency.format(low) : `${currency.format(low)} - ${currency.format(high)}`,
    source: routeDetails.airportRates ? `Fixed Northampton airport rate for ${routeDetails.airportName}` : "Mileage estimate",
    isReturn: fareReturn.checked
  };
};

const updateFareEstimate = () => {
  if (!fareVehicle || !fareTotal || !fareVehicleLabel) {
    return;
  }

  const rate = fareRates[fareVehicle.value];
  fareVehicleLabel.textContent = rate.label;

  if (!routeDetails) {
    fareTotal.textContent = "Enter route";
    fareDistanceLabel.textContent = "Awaiting route";
    fareDurationLabel.textContent = "Awaiting route";
    fareRateLabel.textContent = "Awaiting route";
    latestFareSummary = "No fare estimate requested";

    if (fareEstimateField) {
      fareEstimateField.value = latestFareSummary;
    }

    if (fareAddToEnquiry) {
      fareAddToEnquiry.disabled = true;
    }

    return;
  }

  const estimate = getFareEstimate();

  fareTotal.textContent = estimate.range;
  fareDistanceLabel.textContent = routeDetails.distanceLabel;
  fareDurationLabel.textContent = routeDetails.durationLabel;
  fareRateLabel.textContent = routeDetails.airportRates ? "Airport preset" : "Mileage";

  latestFareSummary = [
    `Fare estimate: ${estimate.range}`,
    `Pickup: ${routeDetails.pickup}`,
    `Destination: ${routeDetails.dropoff}`,
    `Vehicle: ${estimate.rate.label}`,
    `Distance: ${routeDetails.distanceLabel}`,
    `Estimated drive time: ${routeDetails.durationLabel}`,
    `Rate type: ${estimate.source}`,
    `Journey: ${estimate.isReturn ? "Return journey" : "One way"}`
  ].join("\n");

  if (fareEstimateField) {
    fareEstimateField.value = latestFareSummary;
  }

  if (fareAddToEnquiry) {
    fareAddToEnquiry.disabled = false;
  }

  if (routeDetails.airportRates) {
    setFareStatus("This uses the fixed Northampton airport rate. Final pricing may vary for parking, waiting time, route changes and specific collection details.");
  } else {
    setFareStatus("This is a guide mileage estimate. Final pricing may vary for waiting time, parking, route changes, peak dates and specific collection details.");
  }
};

const clearMapRoute = () => {
  if (routeLayer) {
    routeLayer.remove();
    routeLayer = null;
  }

  if (pickupMarker) {
    pickupMarker.remove();
    pickupMarker = null;
  }

  if (dropoffMarker) {
    dropoffMarker.remove();
    dropoffMarker = null;
  }
};

const clearRouteEstimate = () => {
  routeRequestId += 1;
  routeDetails = null;
  clearMapRoute();
  updateFareEstimate();
  setFareStatus("Enter both locations, then calculate the route.");
};

const resetAirportPreset = () => {
  selectedAirportKey = "";

  if (fareAirport) {
    fareAirport.value = "";
  }
};

const renderSuggestions = (items, listElement, fieldType) => {
  if (!listElement) {
    return;
  }

  listElement.innerHTML = "";

  if (!items.length) {
    listElement.classList.remove("is-open");
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.formatted;

    button.addEventListener("click", () => {
      selectedPlaces[fieldType] = item;
      const input = fieldType === "pickup" ? farePickup : fareDropoff;
      input.value = item.formatted;
      listElement.classList.remove("is-open");
      listElement.innerHTML = "";
      clearRouteEstimate();

      if (selectedPlaces.pickup && selectedPlaces.dropoff) {
        calculateRoute();
      }
    });

    listElement.appendChild(button);
  });

  listElement.classList.add("is-open");
};

const fetchAutocomplete = async (query) => {
  const params = new URLSearchParams({
    text: query,
    filter: "countrycode:gb",
    bias: "proximity:-0.9027,52.2405",
    limit: "5",
    format: "json",
    apiKey: geoapifyApiKey
  });
  const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Autocomplete request failed");
  }

  const data = await response.json();

  return (data.results || []).filter((item) => item.lat && item.lon && item.formatted);
};

const setupAutocomplete = (input, listElement, fieldType) => {
  if (!input || !listElement) {
    return;
  }

  let autocompleteTimer;

  input.addEventListener("input", () => {
    selectedPlaces[fieldType] = null;
    resetAirportPreset();
    clearTimeout(autocompleteTimer);
    clearRouteEstimate();

    const query = input.value.trim();

    if (!hasGeoapifyKey()) {
      setFareStatus("Add your Geoapify API key in index.html to enable address suggestions and routing.");
      return;
    }

    if (query.length < 3) {
      listElement.classList.remove("is-open");
      listElement.innerHTML = "";
      return;
    }

    autocompleteTimer = window.setTimeout(async () => {
      try {
        const items = await fetchAutocomplete(query);
        renderSuggestions(items, listElement, fieldType);
      } catch (error) {
        listElement.classList.remove("is-open");
        setFareStatus("Address suggestions could not load. Please try again.");
      }
    }, 280);
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => listElement.classList.remove("is-open"), 160);
  });
};

const resolveLocation = async (fieldType) => {
  const input = fieldType === "pickup" ? farePickup : fareDropoff;
  const selectedPlace = selectedPlaces[fieldType];

  if (selectedPlace && selectedPlace.formatted === input.value.trim()) {
    return selectedPlace;
  }

  const items = await fetchAutocomplete(input.value.trim());
  const place = items[0];

  if (place) {
    selectedPlaces[fieldType] = place;
    input.value = place.formatted;
  }

  return place;
};

const renderRoute = (routeGeoJson, pickup, dropoff) => {
  if (!map || !window.L) {
    return;
  }

  clearMapRoute();

  routeLayer = L.geoJSON(routeGeoJson, {
    style: {
      color: "#d4b05e",
      opacity: 0.92,
      weight: 5
    }
  }).addTo(map);

  pickupMarker = L.marker([pickup.lat, pickup.lon]).addTo(map);
  dropoffMarker = L.marker([dropoff.lat, dropoff.lon]).addTo(map);

  const bounds = routeLayer.getBounds();

  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [28, 28]
    });
  }
};

const calculateRoute = async () => {
  if (!hasGeoapifyKey()) {
    setFareStatus("Add your Geoapify API key in index.html to enable route search.");
    return;
  }

  const pickupText = farePickup.value.trim();
  const dropoffText = fareDropoff.value.trim();

  if (!pickupText || !dropoffText) {
    setFareStatus("Enter both a starting location and an end location.");
    return;
  }

  const requestId = routeRequestId + 1;
  routeRequestId = requestId;
  const activeAirportKey = selectedAirportKey;

  setFareStatus("Calculating route...");

  try {
    const pickup = await resolveLocation("pickup");
    const dropoff = await resolveLocation("dropoff");

    if (!pickup || !dropoff) {
      setFareStatus("We could not find one of those locations. Please choose a suggestion and try again.");
      return;
    }

    const params = new URLSearchParams({
      waypoints: `${pickup.lat},${pickup.lon}|${dropoff.lat},${dropoff.lon}`,
      mode: "drive",
      apiKey: geoapifyApiKey
    });
    const response = await fetch(`https://api.geoapify.com/v1/routing?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Routing request failed");
    }

    const routeGeoJson = await response.json();

    if (requestId !== routeRequestId) {
      return;
    }

    const route = routeGeoJson.features && routeGeoJson.features[0];

    if (!route || !route.properties) {
      throw new Error("Route unavailable");
    }

    const distanceMeters = getRouteMetric(route.properties, "distance");
    const durationSeconds = getRouteMetric(route.properties, "time");

    if (!distanceMeters || !durationSeconds) {
      throw new Error("Route metrics unavailable");
    }

    routeDetails = {
      pickup: pickup.formatted,
      dropoff: dropoff.formatted,
      distanceMeters,
      durationSeconds,
      distanceLabel: formatDistance(distanceMeters),
      durationLabel: formatDuration(durationSeconds),
      airportName: activeAirportKey ? airportRates[activeAirportKey].label : "",
      airportRates: activeAirportKey ? airportRates[activeAirportKey].rates : null
    };

    renderRoute(routeGeoJson, pickup, dropoff);
    updateFareEstimate();
  } catch (error) {
    if (requestId !== routeRequestId) {
      return;
    }

    routeDetails = null;
    clearMapRoute();
    updateFareEstimate();
    setFareStatus("We could not calculate that route. Check both locations and try again.");
  }
};

const applyAirportPreset = () => {
  selectedAirportKey = fareAirport ? fareAirport.value : "";

  if (!selectedAirportKey) {
    clearRouteEstimate();
    return;
  }

  const airport = airportRates[selectedAirportKey];

  selectedPlaces.pickup = northamptonPlace;
  selectedPlaces.dropoff = airport.place;
  farePickup.value = northamptonPlace.formatted;
  fareDropoff.value = airport.place.formatted;

  calculateRoute();
};

const initFareMap = () => {
  if (!fareMap) {
    return;
  }

  updateFareEstimate();

  if (!hasGeoapifyKey()) {
    setFareStatus("Add your Geoapify API key in index.html to enable address suggestions and routing.");
    return;
  }

  if (!window.L) {
    setFareStatus("The map library could not load. Check the Leaflet script in index.html.");
    return;
  }

  if (fareMapMessage) {
    fareMapMessage.remove();
  }

  map = L.map(fareMap, {
    scrollWheelZoom: false
  }).setView([52.2405, -0.9027], 10);

  const isRetina = L.Browser.retina;
  const tileUrl = isRetina
    ? "https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey={apiKey}"
    : "https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey={apiKey}";

  L.tileLayer(tileUrl, {
    attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">&copy; OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">&copy; OpenStreetMap</a> contributors',
    apiKey: geoapifyApiKey,
    maxZoom: 20
  }).addTo(map);

  setFareStatus("Enter a starting location and destination, then calculate the route.");
};

if (fareVehicle && fareReturn) {
  [fareVehicle, fareReturn].forEach((control) => {
    control.addEventListener("change", updateFareEstimate);
  });
}

if (fareAirport) {
  fareAirport.addEventListener("change", applyAirportPreset);
}

setupAutocomplete(farePickup, farePickupSuggestions, "pickup");
setupAutocomplete(fareDropoff, fareDropoffSuggestions, "dropoff");

if (fareCalculate) {
  fareCalculate.addEventListener("click", calculateRoute);
}

if (fareAddToEnquiry && journeyField) {
  fareAddToEnquiry.addEventListener("click", () => {
    const currentJourney = journeyField.value.trim();
    const withoutOldEstimate = currentJourney.replace(/(^|\n\n)Fare estimate:[\s\S]*$/, "").trim();

    journeyField.value = [withoutOldEstimate, latestFareSummary].filter(Boolean).join("\n\n");
    journeyField.focus();
    journeyField.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  });
}

initFareMap();

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.18
  });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}
