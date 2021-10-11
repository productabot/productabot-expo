import React, { useState, useRef } from 'react';
import { TouchableOpacity, RefreshControl, Image, useWindowDimensions, Platform, Alert, Animated, Easing } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { StartupComponent } from '../components/StartupComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import AutoDragSortableView from '../components/AutoDragSortableViewComponent';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import * as Haptics from 'expo-haptics';

export default function ProjectsScreen({ route, navigation, refresh, setLoading }: any) {
  const window = useWindowDimensions();
  const [refreshControl, setRefreshControl] = useState(false);
  const [projects, setProjects] = useState([]);
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0, archive: () => { }, rename: () => { } });
  const [greeting, setGreeting] = useState(<View />);
  const [archived, setArchived] = useState(false);
  const opacity = Array(20).fill(0).map(() => useRef(new Animated.Value(0)).current);
  const menuRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!route.params) { route.params = {}; }
      onRefresh();
    }, [refresh, archived, route.params])
  );

  let onRefresh = async (showRefreshControl = false) => {
    showRefreshControl ? setRefreshControl(true) : setLoading(true);
    let dateFrom = new Date();
    dateFrom.setDate(1);
    let dateFromString = dateFrom.toISOString().split('T')[0];
    let dateTo = new Date();
    dateTo.setMonth(dateTo.getMonth() + 1);
    dateTo.setDate(0);
    let dateToString = dateTo.toISOString().split('T')[0];

    let data = await API.graphql(graphqlOperation(`{
      projects(order_by: {order: asc}, where: {archived: {_eq: ${archived ? 'true' : 'false'}}}) {
        id
        name
        image
        goal
        color
        public
        archived
        timesheets_aggregate(where: {date: {_gte: "${dateFromString}", _lte: "${dateToString}"}}) {
          aggregate {
            sum {
              hours
            }
          }
        }
      }
      users {
        username
        image
      }
    }
    `));
    setProjects(data.data.projects.concat({ id: null }));
    let currentHour = new Date().getHours();
    let username = await (await Auth.currentSession()).getIdToken().payload.preferred_username;
    setGreeting(<View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
      {(Platform.OS === 'web' && window.width > 800) && <Text>{(currentHour < 12 && currentHour > 6) ? `good morning, ` : currentHour < 18 ? `good afternoon, ` : currentHour < 22 ? `good evening, ` : `good night, `}</Text>}
      <TouchableOpacity onPress={() => { navigation.navigate('settings') }} style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }} >
        <Image style={{ width: 25, height: 25, borderWidth: 1, borderColor: '#ffffff', borderRadius: 5, marginRight: 5 }} source={{ uri: `https://files.productabot.com/public/${data.data.users[0].image}` }} />
        <Text>{data.data.users[0].username}</Text>
      </TouchableOpacity>
    </View>);
    showRefreshControl ? setRefreshControl(false) : setLoading(false);
  }

  React.useEffect(() => {
    onRefresh();
  }, [archived]);

  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: root.desktopWeb ? 30 : 0
    }}>
      <AutoDragSortableView
        isDragFreely={true}
        style={{ padding: root.desktopWeb ? 0 : (window.width - (2 * 140)) / 6 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshControl}
            onRefresh={() => onRefresh(true)}
            colors={["#ffffff"]}
            tintColor='#ffffff'
            titleColor="#ffffff"
            title=""
          />}
        renderHeaderView={
          <View style={{ marginTop: Platform.OS === 'web' ? 30 : 0, flexDirection: 'row', justifyContent: 'space-between', padding: (Platform.OS === 'web' && window.width > 1280) ? 60 : 20, paddingTop: 0, paddingBottom: 0, marginBottom: -10, zIndex: 1 }}>
            <Text style={{ color: '#ffffff', fontSize: 20 }}>{greeting}</Text>
            <TouchableOpacity onPress={() => { setArchived(!archived) }} style={{ flexDirection: 'row' }}>
              <Text style={{ marginRight: 5 }}>archived</Text>
              <View style={{ borderWidth: 1, borderColor: '#ffffff', borderRadius: 5, height: 20, width: 20, marginRight: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>{archived ? '✓' : ''}</Text></View>
            </TouchableOpacity>
          </View>}
        minOpacity={100}
        maxScale={1.1}
        delayLongPress={100}
        onDragStart={() => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
        onDragEnd={() => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        sortable={true}
        dataSource={projects}
        parentWidth={root.desktopWeb ? Math.min(window.width, root.desktopWidth) : window.width}
        marginChildrenTop={25}
        marginChildrenBottom={25}
        marginChildrenLeft={root.desktopWeb ? (Math.min(window.width, root.desktopWidth) - ((window.width < 600 ? 3 : window.width < 800 ? 4 : 5) * 141)) / (window.width < 600 ? 6 : window.width < 800 ? 8 : 10) : (window.width - (2 * 140)) / 6}
        marginChildrenRight={root.desktopWeb ? (Math.min(window.width, root.desktopWidth) - ((window.width < 600 ? 3 : window.width < 800 ? 4 : 5) * 141)) / (window.width < 600 ? 6 : window.width < 800 ? 8 : 10) : (window.width - (2 * 140)) / 6}
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
          item.id ?
            <View
              onContextMenu={(e) => {
                e.preventDefault(); setContextPosition({
                  x: e.pageX, y: e.pageY,
                  archive: async () => {
                    const archiveFunction = async () => {
                      setLoading(true);
                      await API.graphql(graphqlOperation(`mutation{update_projects_by_pk(pk_columns: {id: "${item.id}"}, _set: {archived: "${item.archived ? 'false' : 'true'}"}) {id}}`));
                      await onRefresh();
                      setLoading(false);
                    }
                    if (Platform.OS !== 'web') {
                      Alert.alert('Warning', `Are you sure you want to ${archived ? 'un' : ''}archive this project?`,
                        [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await archiveFunction(); } }]);
                    }
                    else if (confirm(`Are you sure you want to ${archived ? 'un' : ''}archive this project?`)) { await archiveFunction() }
                  },
                  rename: async () => {
                    const renameFunction = async (rename) => {
                      setLoading(true);
                      if (rename) {
                        await API.graphql(graphqlOperation(`mutation{update_projects_by_pk(pk_columns: {id: "${item.id}"}, _set: {name: "${rename}"}) {id}}`));
                      }
                      await onRefresh();
                      setLoading(false);
                    }
                    if (Platform.OS !== 'web') {
                      Alert.prompt('Rename', '', async (text) => {
                        await renameFunction(text);
                      }, 'plain-text', item.name);
                    }
                    else {
                      let rename = prompt('Rename', item.name);
                      await renameFunction(rename);
                    }
                  }
                });
                menuRef.current.open();
              }}
              onPress={() => { navigation.navigate('project', { id: item.id }) }}
              style={{ alignItems: 'center', width: 140, cursor: 'grab' }}
              key={item.id}>
              <View style={{ width: 140, height: 140, borderColor: '#ffffff', borderWidth: 1, borderRadius: 20 }}>
                <Animated.Image
                  onLoad={() => { Animated.timing(opacity[index], { toValue: 1, duration: 100, useNativeDriver: false }).start(); }}
                  style={{ opacity: opacity[index], width: 138, height: 138, borderRadius: 20 }}
                  source={{ uri: `https://files.productabot.com/public/${item.image}` }}
                />
              </View>
              {item.goal &&
                <View style={{ position: 'absolute', flexDirection: 'row', width: '80%', height: 5, bottom: -8, backgroundColor: '#000000', borderColor: '#666666', borderWidth: 1, borderRadius: 5, alignItems: 'flex-start', alignContent: 'flex-start' }}>
                  <View style={{ height: '100%', backgroundColor: item.color === '#000000' ? '#ffffff' : item.color, width: `${(Math.min(item.timesheets_aggregate.aggregate.sum.hours / item.goal, 1) * 100).toFixed(0)}%`, borderRadius: 3 }} />
                </View>}
              <Text numberOfLines={1} ellipsizeMode='tail'>{item.public ? '' : '🔒'}{item.name}</Text>
            </View>

            :
            <View
              onContextMenu={(e) => { e.preventDefault(); }}
              onPress={async () => {
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
      <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer}>
        <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y, left: contextPosition.x } }} />
        <MenuOptions customStyles={{ optionsWrapper: { backgroundColor: '#000000', borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', width: 100 }, optionsContainer: { width: 100 } }}>
          <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, paddingLeft: 20, width: '100%' }} onPress={async () => {
              menuRef.current.close();
              await contextPosition.rename();
              await onRefresh();
            }} ><Text>Rename</Text></TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 20, width: '100%' }} onPress={async () => {
              menuRef.current.close();
              await contextPosition.archive();
              await onRefresh();
            }}><Text>{archived ? 'Unarchive' : 'Archive'}</Text></TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#000000', padding: 5, paddingLeft: 20, width: '100%' }}
              onPress={() => { menuRef.current.close(); }}><Text>Cancel</Text></TouchableOpacity>
          </View>
        </MenuOptions>
      </Menu>
    </View>
  );
}