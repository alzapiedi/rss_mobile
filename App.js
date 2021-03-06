import React from 'react';
import { Image, StyleSheet, Text, View, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Constants, MapView } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import Dimensions from 'Dimensions';
import { Svg } from 'expo'
import Emoji from 'react-native-emoji';

const { height, width } = Dimensions.get('window');
const PULLOUT_HEIGHT = height * 0.5;
const PULLOUT_DELTA = PULLOUT_HEIGHT / 10;

export default class App extends React.Component {
  state = {
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
          initialRegion={this.state.region}
        >
          {this.state.entries.map(this.renderMapMarker, this)}
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

  renderMapMarker = entry => {
    return (
      <MapView.Marker key={entry.link} centerOffset={{x: 0, y: -20}} coordinate={entry.coordinates} onPress={this.handlePressMapMarker.bind(this, entry)}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 15, height: 40, width: 40, justifyContent: 'center', alignItems: 'center', shadowOffset: {  width: 2,  height: 2 }, shadowColor: '#000', shadowOpacity: 1.0, }}>
            <Text fontSize={20}><Emoji name={entry.emoji} /></Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'transparent', width: 0, height: 0, alignSelf:'center', borderStyle: 'solid', borderTopColor: '#fff', borderTopWidth:10, borderLeftWidth:5, borderLeftColor: 'transparent', borderRightWidth:5, borderRightColor: 'transparent' }} />
        </View>
      </MapView.Marker>
    );
  }

  renderEntry = entry => {
    return (
      <TouchableOpacity onPress={this.handleLink.bind(this, entry.item)} key={entry.item.link}>
        <View style={{ flexDirection: 'row', padding: 5, borderTopColor: 'black', borderBottomWidth: 1 }}>
          {entry.item.image ? <Image source={{uri: entry.item.image.src}} style={{ height: 100, width: 100 }} /> : null}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>{entry.item.title}</Text>
            <Text numberOfLines={5} style={{ fontSize: 11 }}>{entry.item.body}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  handlePressMapMarker = entry => {
    this.setState({ selectedEntries: this.state.entries.filter(e => e.coordinates.latitude == entry.coordinates.latitude && e.coordinates.longitude === entry.coordinates.longitude) }, this.openPulloutMenu);

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

  componentDidMount() {
    this.setState({ region:
      {
        latitude: 39.952,
        longitude: -75.1636,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421
      }
    });
    fetch('http://108.4.212.129:4000/feed')
      .then(res => res.json())
      .then(json => this.setState({ entries: json.entries.map(entry => ({ ...entry, key: entry.link })) }))
      .catch(e => console.log(e.message));
  }

  openPulloutMenu = () => {
    if (this.state.isTransitioning || this.state.isOpen) return;
    this.setState({ region: {
      latitude: 39.90122 - 0.0230,
      longitude: -75.172,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421
    }});
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
});
