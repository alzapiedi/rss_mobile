import React from 'react';
import { Image, StyleSheet, Text, View, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Constants, MapView } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import Dimensions from 'Dimensions';
import Emoji from './Emoji';
import moment from 'moment';
import supercluster from 'supercluster';

const { height, width } = Dimensions.get('window');
const API_BASE_URL='http://172.16.94.33:4000';
const PULLOUT_HEIGHT = height * 0.5;
const PULLOUT_DELTA = PULLOUT_HEIGHT / 10;

// IDEA: only update state.region on region change complete, but update another state key on region change that supercluster uses to calculate points
// TODO: use animated API for pullout menu

export default class App extends React.Component {
  state = {
    mapReady: false,
    pulloutTop: height,
    isTransitioning: false,
    region: {
      latitude: 39.952,
      longitude: -75.1636,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421
    },
    entries: [],
    selectedEntries: []
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#faebd7', height: Constants.statusBarHeight }} />
        <MapView
          onPress={this.handlePressMap}
          style={{ flex: 1 }}
          provider="google"
          region={this.state.region}
          onRegionChangeComplete={this.onRegionChange}>
            {this.getPointsAndClusters().map(this.renderMapMarker)}
          </MapView>
        <View style={{ flex: 1, position: 'absolute', height: PULLOUT_HEIGHT, width, backgroundColor: '#fff', top: this.state.pulloutTop, flexDirection: 'column', borderTopColor: 'black', borderTopWidth: 1 }}>
          <FlatList data={this.state.selectedEntries} renderItem={this.renderEntry} />
          <View style={{ height: 50, backgroundColor: '#dcd8ef', alignItems: 'center', justifyContent: 'center' }}>
            <TouchableOpacity activeOpacity={0} onPress={this.closePulloutMenu}><Ionicons name="ios-close" size={44} /></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  renderMapMarker = data => {
    return (
      <MapView.Marker key={String(Math.random())} centerOffset={{x: 0, y: -20}} coordinate={this.coordinateArrayToObject(data.geometry.coordinates)} onPress={this.handlePressMapMarker.bind(this, data)}>
        {data.properties && data.properties.cluster ? this.renderCluster(data) : this.renderPoint(data)}
      </MapView.Marker>
    );
  }

  renderPoint(point) {
    return (
      <View style={{ flex: 1, flexDirection: 'column', width: 45 }}>
        <View style={[styles.emojiCircle, { width: 40 }]}>
          <Text fontSize={20}><Emoji name={point.entry.emoji} /></Text>
        </View>
        <View style={{ flex: 1, backgroundColor: 'transparent', width: 0, height: 0, alignSelf:'center', borderStyle: 'solid', borderTopColor: '#fff', borderTopWidth:10, borderLeftWidth:5, borderLeftColor: 'transparent', borderRightWidth:5, borderRightColor: 'transparent' }} />
      </View>
    );
  }

  renderCluster(cluster) {
    const leaves = this.state.clusters.getLeaves(cluster.properties.cluster_id);
    const width = leaves.length > 1 ? 80 : 40;
    const emojiPoints = leaves.length > 2 ? leaves.splice(0,3).map(leaf => leaf.entry.emoji) : leaves.map(leaf => leaf.entry.emoji);
    return (
      <View style={{ flex: 1, flexDirection: 'column', width: width + 5 }}>
        <View style={[styles.emojiCircle, { width }]}>
          <Text fontSize={20}>{emojiPoints.map((name, i) => <Emoji key={i} name={name} />)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: 'transparent', width: 0, height: 0, alignSelf:'center', borderStyle: 'solid', borderTopColor: '#fff', borderTopWidth:10, borderLeftWidth:5, borderLeftColor: 'transparent', borderRightWidth:5, borderRightColor: 'transparent' }} />
      </View>
    );
  }

  renderEntry = entry => {
    return (
      <TouchableOpacity onPress={this.handleLink.bind(this, entry.item)} key={entry.item.link}>
        <View style={{ flexDirection: 'row', padding: 5, borderTopColor: 'black', borderBottomWidth: 1 }}>
          {entry.item.image ? <Image source={{uri: entry.item.image.src}} style={{ height: 100, width: 100 }} /> : null}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: 'bold' }}>{entry.item.title}</Text>
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', marginBottom: 5 }}>{moment(entry.item.date).fromNow()}</Text>
            <Text numberOfLines={5} style={{ fontSize: 11 }}>{entry.item.body}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  coordinateArrayToObject(array) {
    return {
      latitude: array[1],
      longitude: array[0]
    };
  }

  onRegionChange = region => {
    this.setState({ region });
  }

  handlePressMapMarker = data => {
    if (data.properties && data.properties.cluster) {
      const selectedEntries = this.state.clusters.getLeaves(data.properties.cluster_id).map(leaf => leaf.entry);
      return this.setState({ selectedEntries }, this.openPulloutMenu)
    }
    this.setState({ selectedEntries: [data.entry] }, this.openPulloutMenu);
  }

  handleLink = entry => {
    Linking.canOpenURL(entry.link).then(supported => {
      if (supported) {
        Linking.openURL(entry.link);
      } else {
        console.log("Don't know how to open URI: " + entry.link);
      }
    });
  }

  handlePressMap = () => {
    this.closePulloutMenu();
  }

  loadClusters = () => {
    const clusters = supercluster({
      radius: 40,
      maxZoom: 16,
      minZoom: 9
    });
    clusters.load(this.getPoints());
    this.setState({ clusters });
    this.forceUpdate();
  }

  getPointsAndClusters = () => {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = this.state.region;
    if (!this.state.clusters) return [];
    const bbox = [longitude - longitudeDelta, latitude - latitudeDelta, longitude + longitudeDelta, latitude + latitudeDelta];
    const result = this.state.clusters.getClusters(
      bbox,
      this.getZoom()
    );
    return result;
  }

  getPoints() {
    const points = this.state.entries.map(entry => {
      return {
        entry,
        geometry: {
          type: 'Point',
          coordinates: [entry.coordinates.longitude, entry.coordinates.latitude]
        }
      };
    });
    return points;
  }

  oldGetZoom = () => {
    const level = Math.round(1 / this.state.region.latitudeDelta);
    return this.state.latitudeDelta < 0.09 ? Math.round(1 / this.state.region.latitudeDelta) : Math.round(1 / (2*this.state.region.latitudeDelta));
  }

  getZoom = () => {
    if (this.state.region.latitudeDelta < 0.005) return 17;
    if (this.state.region.latitudeDelta < 0.01) return 16;
    if (this.state.region.latitudeDelta < 0.015) return 15;
    if (this.state.region.latitudeDelta < 0.02) return 14;
    if (this.state.region.latitudeDelta < 0.025) return 13;
    if (this.state.region.latitudeDelta < 0.03) return 12;
    if (this.state.region.latitudeDelta < 0.04) return 11;
    if (this.state.region.latitudeDelta < 0.05) return 10;
    if (this.state.region.latitudeDelta < 0.06) return 9;
    if (this.state.region.latitudeDelta < 0.07) return 8;
    if (this.state.region.latitudeDelta < 0.08) return 7;
    if (this.state.region.latitudeDelta < 0.09) return 6;
    if (this.state.region.latitudeDelta < 0.105) return 5;
    if (this.state.region.latitudeDelta < 0.15) return 4;
    if (this.state.region.latitudeDelta < 0.18) return 3;
    if (this.state.region.latitudeDelta < 0.21) return 2;
    if (this.state.region.latitudeDelta < 0.24) return 1;
    return 0;
  }

  componentDidMount() {
    this.setState({ region:
      {
        latitude: 39.952,
        longitude: -75.1636,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421
      }
    });
    fetch(API_BASE_URL + '/feed')
      .then(res => res.json())
      .then(json => this.setState({ entries: json.entries.map(entry => ({ ...entry, key: entry.link })) }, this.loadClusters))
      .catch(e => console.log(e.message));
  }

  openPulloutMenu = () => {
    if (this.state.isTransitioning || this.state.isOpen) return;
    this.setState({ isTransitioning: true }, () => {
      this.interval = setInterval(() => {
        const isComplete = Math.abs(this.state.pulloutTop - (height - PULLOUT_HEIGHT)) < 1;
        if (isComplete) {
          this.setState({ isTransitioning: false, isOpen: true });
          clearInterval(this.interval);
          return;
        }
        this.setState({ pulloutTop: this.state.pulloutTop - PULLOUT_DELTA });
      }, 10)
    });
  }

  closePulloutMenu = () => {
    if (this.state.isTransitioning || !this.state.isOpen) return;
    this.setState({ isTransitioning: false }, () => {
      this.interval = setInterval(() => {
        const isComplete = Math.abs(this.state.pulloutTop - height) < 1;
        if (isComplete) {
          this.setState({ isTransitioning: false, isOpen: false });
          clearInterval(this.interval);
          return;
        }
        this.setState({ pulloutTop: this.state.pulloutTop + PULLOUT_DELTA });
      }, 10)
    });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCircle: { flex: 1, borderStyle: 'solid', backgroundColor: '#fff', borderRadius: 16, height: 40, justifyContent: 'center', alignItems: 'center', shadowRadius: 0, shadowOffset: {  width: 2,  height: 2 }, shadowColor: '#000', shadowOpacity: 0.45 }
});
