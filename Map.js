import React from 'react';
import { Image, StyleSheet, Text, View, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Constants, MapView } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import Dimensions from 'Dimensions';
const i = 1;

export default class Map extends React.Component {
  render() {
    console.log(i++);
    const { markers, ...rest } = this.props;

    return (
        <MapView
          onPress={this.props.handlePressMap}
          style={{ flex: 1 }}
          provider="google"
          region={this.props.region}
          onRegionChange={this.props.onRegionChange}>
            {markers.map(this.props.renderMarker)}
          </MapView>
    );
  }
  shouldComponentUpdate(nextProps, _) {
    if (!nextProps.markers) return false;
    return !this.props.markers.every((marker, i) => marker.geometry.coordinates[0] === nextProps.markers[i].geometry.coordinates[0])
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
