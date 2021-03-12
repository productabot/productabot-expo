import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, navItem } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import AutoDragSortableView from '../components/AutoDragSortableViewComponent';

export default function ProjectsScreen({ route, navigation, refresh }: any) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      if (!route.params) { route.params = {}; }
      onRefresh();
    }, [refresh])
  );

  let onRefresh = async () => {
    setLoading(true);
    let data = await API.graphql(graphqlOperation(`{
      projects(order_by: {order: asc}) {
        id
        name
        image
      }
    }
    `));
    setProjects(data.data.projects.concat({ id: null }));
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {root.desktopWeb ?
        <View style={{ height: 50 }} />
        :
        <View style={{ paddingTop: 40, paddingBottom: 10 }}>
          <Text>Projects</Text>
        </View>}
      <AutoDragSortableView
        isDragFreely={true}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            colors={["#ffffff"]}
            tintColor='#ffffff'
            titleColor="#ffffff"
            title=""
          />}
        delayLongPress={200}
        sortable={true}
        dataSource={projects}
        parentWidth={root.desktopWeb ? root.desktopWidth : root.windowWidth}
        marginChildrenTop={30}
        marginChildrenBottom={30}
        marginChildrenLeft={root.desktopWeb ? (root.desktopWidth - (4 * 140)) / 10 : (root.windowWidth - (2 * 140)) / 6}
        marginChildrenRight={root.desktopWeb ? (root.desktopWidth - (4 * 140)) / 10 : (root.windowWidth - (2 * 140)) / 6}
        childrenWidth={140}
        childrenHeight={140}
        fixedItems={[projects.length - 1]}
        keyExtractor={(item, index) => item.id}
        onDataChange={async (data) => {
          data.pop(); //removes the null "add project" item
          await API.graphql(graphqlOperation(`mutation {
              ${data.map((project, projectIndex) => `data${projectIndex}: update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {order: ${projectIndex}}) {id}`)}
          }`));
        }}
        onClickItem={async (array, item) => {
          if (item.id) {
            navigation.navigate('project', { id: item.id })
          }
          else {
            setLoading(true);
            let data = await API.graphql(graphqlOperation(`mutation {
              insert_projects_one(object: {name: "new project", key: "NP", description: "Add a description to your new project", color: "#ff0000"}) {
                id
              }
            }`));
            setLoading(false);
            navigation.navigate('project', { id: data.data.insert_projects_one.id });
          }
        }}
        renderItem={(item, index) => (
          item.id ? <View onPress={() => { navigation.navigate('project', { id: item.id }) }} style={{ alignItems: 'center', margin: 10, marginLeft: 20, marginRight: 20, width: 140 }} key={item.id}>
            {item.image ?
              <Image
                style={{ width: 140, height: 140, borderColor: '#ffffff', borderWidth: 1 }}
                source={{ uri: `https://files.productabot.com/${item.image}` }}
              />
              :
              <View style={{ width: 140, height: 140, borderColor: '#ffffff', borderWidth: 1 }} />
            }
            <Text numberOfLines={1} ellipsizeMode='tail'>{item.name}</Text>
          </View>
            :
            <View onPress={async () => {
              setLoading(true);
              let data = await API.graphql(graphqlOperation(`mutation {
                insert_projects_one(object: {name: "new project", key: "NP", description: "Add a description to your new project", color: "#ff0000", order: ${projects.length}}) {
                  id
                }
              }`));
              setLoading(false);
              navigation.navigate('project', { id: data.data.insert_projects_one.id });
            }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 10, marginLeft: 20, marginRight: 20, width: 140, height: 140 }}>
              <Text style={{ fontSize: 30 }}>+</Text>
            </View>
        )}
      />
      {loading && <LoadingComponent />}
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
