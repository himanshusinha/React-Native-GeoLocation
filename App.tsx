import React, { useEffect, useRef, useState } from 'react';

import { Alert, StyleSheet, View, TouchableOpacity, Text } from 'react-native';

import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';

import Geolocation from '@react-native-community/geolocation';

import * as turf from '@turf/turf';

// -----------------------------------
// GEOLOCATION CONFIG
// -----------------------------------

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  enableBackgroundLocationUpdates: false,
  locationProvider: 'auto',
});

// -----------------------------------
// GEOFENCE AREA
// -----------------------------------

const POLYGON_COORDINATES = [
  {
    latitude: 22.72345,
    longitude: 75.8472,
  },
  {
    latitude: 22.725,
    longitude: 75.85,
  },
  {
    latitude: 22.721,
    longitude: 75.853,
  },
  {
    latitude: 22.719,
    longitude: 75.848,
  },
];

const App: React.FC = () => {
  const mapRef = useRef<MapView | null>(null);

  // Prevent repeated alerts
  const previousStatusRef = useRef('');

  // Follow user toggle
  const [followUser, setFollowUser] = useState(true);

  // Live user location
  const [userCoordinates, setUserCoordinates] = useState({
    latitude: 22.72345,
    longitude: 75.8472,
  });

  // Route path
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);

  // Geofence status
  const [status, setStatus] = useState('Checking...');

  // Selected point
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // -----------------------------------
  // MAP PRESS
  // -----------------------------------

  const handleMapPress = (event: any) => {
    const coordinate = event.nativeEvent.coordinate;

    setSelectedLocation(coordinate);

    console.log('Selected Point:', coordinate);
  };

  // -----------------------------------
  // CHECK GEOFENCE
  // -----------------------------------

  const checkGeofence = (latitude: number, longitude: number) => {
    const point = turf.point([longitude, latitude]);

    const polygon = turf.polygon([
      [
        [75.8472, 22.72345],
        [75.85, 22.725],
        [75.853, 22.721],
        [75.848, 22.719],
        [75.8472, 22.72345],
      ],
    ]);

    const isInside = turf.booleanPointInPolygon(point, polygon);

    // INSIDE
    if (isInside) {
      setStatus('Inside Geofence');

      if (previousStatusRef.current !== 'Inside') {
        Alert.alert('Geofence', 'User entered geofence');

        previousStatusRef.current = 'Inside';
      }
    }

    // OUTSIDE
    else {
      setStatus('Outside Geofence');

      if (previousStatusRef.current !== 'Outside') {
        Alert.alert('Geofence', 'User exited geofence');

        previousStatusRef.current = 'Outside';
      }
    }
  };

  // -----------------------------------
  // INITIAL LOCATION
  // -----------------------------------

  const getInitialLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;

        // Update marker
        setUserCoordinates({
          latitude,
          longitude,
        });

        // Initial route point
        setRouteCoordinates([
          {
            latitude,
            longitude,
          },
        ]);

        // Move camera
        const region: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        mapRef.current?.animateToRegion(region, 1000);

        // Check geofence
        checkGeofence(latitude, longitude);
      },

      error => {
        console.log('Initial Location Error:', error);
      },

      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 10000,
      },
    );
  };

  // -----------------------------------
  // LIVE TRACKING
  // -----------------------------------

  useEffect(() => {
    getInitialLocation();

    const watchId = Geolocation.watchPosition(
      position => {
        const { latitude, longitude } = position.coords;

        console.log('Live Location:', latitude, longitude);

        // Update user marker
        setUserCoordinates({
          latitude,
          longitude,
        });

        // Save route
        setRouteCoordinates(prev => {
          const updated = [
            ...prev,
            {
              latitude,
              longitude,
            },
          ];

          return updated.slice(-100);
        });

        // Camera follow
        if (followUser) {
          mapRef.current?.animateCamera({
            center: {
              latitude,
              longitude,
            },
            zoom: 17,
          });
        }

        // Check geofence
        checkGeofence(latitude, longitude);
      },

      error => {
        console.log('Watch Position Error:', error);
      },

      {
        enableHighAccuracy: false,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 3000,
        maximumAge: 10000,
        useSignificantChanges: true,
      },
    );

    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, [followUser]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation={true}
        showsCompass={true}
        loadingEnabled={true}
        zoomEnabled={true}
        zoomControlEnabled={true}
        initialRegion={{
          latitude: 22.72345,
          longitude: 75.8472,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={handleMapPress}
      >
        {/* USER MARKER */}
        <Marker
          coordinate={userCoordinates}
          title="Current Location"
          description={status}
          pinColor="orange"
        />

        {/* SELECTED POINT */}
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Selected Point"
            pinColor="green"
          />
        )}

        {/* LIVE ROUTE */}
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="blue"
          strokeWidth={5}
        />

        {/* GEOFENCE */}
        <Polygon
          coordinates={POLYGON_COORDINATES}
          strokeColor="rgba(0,0,255,0.8)"
          fillColor="rgba(0,0,255,0.3)"
          strokeWidth={2}
        />
      </MapView>

      {/* FOLLOW BUTTON */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setFollowUser(!followUser)}
      >
        <Text style={styles.buttonText}>
          {followUser ? 'Stop Follow' : 'Follow User'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },

  button: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'black',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },

  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default App;
