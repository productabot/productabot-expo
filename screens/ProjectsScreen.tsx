import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';

export default function ProjectsScreen({ route, navigation }: any) {
  const [state, setState] = useState({
    projects: [],
    loading: false
  });
  useFocusEffect(
    React.useCallback(() => {
      if (!route.params) { route.params = {}; }
      onRefresh();
    }, [])
  );

  let onRefresh = async () => {
    setState({ ...state, loading: true });
    let data = await API.graphql(graphqlOperation(`{
      projects(order_by: {name: asc}) {
        id
        name
        image
      }
    }
    `));
    setState({ ...state, loading: false, projects: data.data.projects.concat({ id: null }) });
  }

  return (
    <View style={styles.container}>
      {root.desktopWeb ?
        <View style={{ height: 50 }} />
        :
        <View style={{ paddingTop: 40, paddingBottom: 10 }}>
          <Text>Projects</Text>
        </View>}
      <FlatList
        style={{ width: '100%', height: '100%' }}
        numColumns={root.desktopWeb ? 4 : 2}
        data={state.projects}
        contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
        renderItem={({ item, index }) => (
          item.id ? <TouchableOpacity onPress={() => { navigation.navigate('project', { id: item.id }) }} style={{ alignItems: 'center', margin: 10, marginLeft: 20, marginRight: 20, width: 120 }} key={item.id}>
            {item.image ?
              <Image
                style={{ width: 120, height: 120, borderColor: '#ffffff', borderWidth: 1 }}
                source={{ uri: `https://files.productabot.com/${item.image}` }}
              />
              :
              <View style={{ width: 120, height: 120, borderColor: '#ffffff', borderWidth: 1 }} />
            }
            <Text numberOfLines={1} ellipsizeMode='tail'>{item.name}</Text>
          </TouchableOpacity>
            :
            <TouchableOpacity onPress={async () => {
              setState({ ...state, loading: true });
              let data = await API.graphql(graphqlOperation(`mutation {
                insert_projects_one(object: {name: "new project", key: "NP", description: "Add a description to your new project", color: "#ff0000"}) {
                  id
                }
              }`));
              setState({ ...state, loading: false });
              navigation.navigate('project', { id: data.data.insert_projects_one.id });
            }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 10, marginLeft: 20, marginRight: 20, width: 120, height: 140 }}>
              <Text style={{ fontSize: 30 }}>+</Text>
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
      {state.loading && <LoadingComponent />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center'
  },
});
