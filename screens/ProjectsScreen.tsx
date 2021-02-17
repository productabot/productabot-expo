import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, Auth } from 'aws-amplify';

export default function ProjectsScreen() {
  const [state, setState] = useState({
    projects: [],
    loading: false
  });
  useEffect(() => {
    console.log(`componentDidMount`);
    onRefresh();
  }, []);

  let onRefresh = async () => {
    let data = await API.graphql(graphqlOperation(`{
      projects {
        id
        name
      }
    }
    `));
    setState({ ...state, projects: data.data.projects })
  }

  return (
    <View style={styles.container}>
      <Text>Projects</Text>
      <FlatList
        // ref={ }
        // ListHeaderComponent={ }
        // stickyHeaderIndices={ }
        style={{ width: '100%', height: '100%' }}
        numColumns={2}
        data={state.projects}
        contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={{ alignItems: 'center', margin: 20, width: 100, height: 125 }} key={item.id}>
            <View style={{ width: 100, height: 100, borderColor: '#ffffff', borderWidth: 1, marginBottom: 5 }}>
            </View>
            <Text numberOfLines={1} ellipsizeMode='tail'>{item.name}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={state.loading}
            onRefresh={onRefresh}
            colors={["#ffffff"]}
            tintColor='#ffffff'
            titleColor="#ffffff"
            title=""
          />}
        onEndReached={() => { }}
        ListEmptyComponent={<View></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 50,
  },
});
