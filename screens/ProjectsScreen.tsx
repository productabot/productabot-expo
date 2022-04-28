import React, { useState, useRef } from 'react';
import { TouchableOpacity, RefreshControl, Image, useWindowDimensions, Platform, Alert, Animated, Easing, ActionSheetIOS } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import AutoDragSortableView from '../components/AutoDragSortableViewComponent';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import * as Haptics from 'expo-haptics';
import { Sortable } from '../components/dndkit/Sortable';
import { useTheme } from '@react-navigation/native';

let projectContextTimeout;

export default function ProjectsScreen({ route, navigation, refresh, setLoading }: any) {
  const window = useWindowDimensions();
  const [refreshControl, setRefreshControl] = useState(false);
  const [projects, setProjects] = useState([]);
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0, value: {}, archive: () => { }, rename: () => { }, focus: () => { }, delete: () => { } });
  const [greeting, setGreeting] = useState(<View />);
  const [user, setUser] = useState({});
  const [archived, setArchived] = useState(false);
  const opacity = Array(20).fill(0).map(() => useRef(new Animated.Value(0)).current);
  const menuRef = useRef(null);
  const { colors } = useTheme();
  const fadeValue = new Animated.Value(0.4);
  Animated.loop(
    Animated.sequence(
      [
        Animated.timing(fadeValue, { toValue: 1, duration: 1000, easing: Easing.sin, useNativeDriver: true }),
        Animated.timing(fadeValue, { toValue: 0.4, duration: 1000, easing: Easing.sin, useNativeDriver: true })
      ]
    )).start();

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
        focused
        entries_aggregate(where: {date: {_gte: "${dateFromString}", _lte: "${dateToString}"}}) {
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
        plan
      }
    }
    `));
    setProjects(data.data.projects.concat({ id: null }));
    let currentHour = new Date().getHours();
    setGreeting(<View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
      {(Platform.OS === 'web' && window.width > 800) && <Text>{(currentHour < 12 && currentHour > 6) ? `good morning, ` : (currentHour < 18 && currentHour >= 12) ? `good afternoon, ` : (currentHour < 22 && currentHour >= 18) ? `good evening, ` : `good night, `}</Text>}
      <TouchableOpacity href={`/settings`} onPress={(e) => { e.preventDefault(); navigation.navigate('settingsTab') }} style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }} >
        <Image style={{ width: 25, height: 25, borderWidth: 1, borderColor: colors.border, borderRadius: 5, marginRight: 5 }} source={{ uri: `https://files.productabot.com/public/${data.data.users[0].image}` }} />
        <Text>{data.data.users[0].username}</Text>
      </TouchableOpacity>
    </View >);
    setUser(data.data.users[0]);
    showRefreshControl ? setRefreshControl(false) : setLoading(false);
  }

  React.useEffect(() => {
    onRefresh();
  }, [archived]);

  React.useEffect(() => {
    const async = async () => {
      await API.graphql(graphqlOperation(`mutation {
          ${projects.filter(obj => obj.id).map((project, projectIndex) => `projects${projectIndex}: update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {order: ${projectIndex}}) {id}`)}
      }`));
    }
    (projects.length > 0 && projects[0]?.id?.length === 36) && async();
  }, [projects]);

  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {Platform.OS === 'web' ?
        projects.length > 0 && <div style={{ width: window.width, height: '100%', paddingTop: 50 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 0, paddingBottom: 0, marginBottom: 15 }}>
            <Text style={{ color: colors.text, fontSize: 20 }}>{greeting}</Text>
            <TouchableOpacity onPress={() => { setArchived(!archived) }} style={{ flexDirection: 'row' }}>
              <Text style={{ marginRight: 5 }}>archived</Text>
              <input checked={archived} style={{ width: 20, height: 20, margin: 0 }} type="checkbox" />
            </TouchableOpacity>
          </View>
          <Sortable
            activationConstraint={{ distance: 1 }}
            items={projects}
            setItems={setProjects}
            setContextPosition={setContextPosition}
            setLoading={setLoading}
            onRefresh={onRefresh}
            menuRef={menuRef}
            archived={archived}
            window={window}
          />
        </div>
        :
        <AutoDragSortableView
          isDragFreely={true}
          style={{ padding: root.desktopWeb ? 0 : (window.width - (2 * 140)) / 6 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshControl}
              onRefresh={() => onRefresh(true)}
              colors={[colors.text]}
              tintColor={colors.text}
              titleColor={colors.text}
              title=""
            />}
          renderHeaderView={
            <View style={{ marginTop: Platform.OS === 'web' ? 30 : -10, flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 0, paddingBottom: 0, marginBottom: 10, zIndex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20 }}>{greeting}</Text>
              {user.plan === 'paid' ?
                <TouchableOpacity onPress={() => { setArchived(!archived) }} style={{ flexDirection: 'row' }}>
                  <Text style={{ marginRight: 5 }}>archived</Text>
                  <View
                    style={{ width: 20, height: 20, borderRadius: 5, borderWidth: archived ? 0 : 1, borderColor: '#767676', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 20, backgroundColor: archived ? '#0075ff' : '#ffffff' }}>
                    {archived && <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>✓</Text>}
                  </View>
                </TouchableOpacity>
                :
                user.plan === 'free' ?
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => { setArchived(!archived) }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: -3 }}>
                      <Text style={{ marginRight: 5 }}>🗑️</Text>
                      <View
                        style={{ width: 20, height: 20, borderRadius: 5, borderWidth: archived ? 0 : 1, borderColor: '#767676', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: archived ? '#0075ff' : '#ffffff' }}>
                        {archived && <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                    <Animated.View style={{ opacity: fadeValue }}>
                      <TouchableOpacity style={{ borderColor: colors.text, borderRadius: 10, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 30, marginRight: 30, marginTop: -5, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10 }} href={`/settings`} onPress={(e) => { e.preventDefault(); navigation.navigate('settingsTab'); }} >
                        <Text style={{ color: colors.text, fontSize: 15 }}>{`upgrade ✦`}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                  :
                  <View />
              }
            </View>}
          minOpacity={100}
          delayLongPress={200}
          onDragStart={(index) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); projectContextTimeout = setTimeout(() => {
              let item = projects[index];
              let options = ['Cancel', item.focused ? 'Unfocus' : 'Focus', 'Rename', item.archived ? 'Unarchive' : 'Archive'];
              if (item.archived) {
                options.push('Delete');
              }
              ActionSheetIOS.showActionSheetWithOptions(
                {
                  options: options,
                  cancelButtonIndex: 0,
                  destructiveButtonIndex: 4
                },
                async (buttonIndex) => {
                  if (buttonIndex === options.indexOf('Delete')) {
                    const deleteFunction = async () => {
                      setLoading(true);
                      await API.graphql(graphqlOperation(`mutation {delete_projects_by_pk(id: "${item.id}") {id}}`));
                      await onRefresh();
                      setLoading(false);
                    }
                    Alert.alert('Warning', `Are you sure you want to delete this project?`,
                      [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                  }
                  else if (buttonIndex === options.indexOf('Archive')) {
                    setLoading(true);
                    await API.graphql(graphqlOperation(`mutation{update_projects_by_pk(pk_columns: {id: "${item.id}"}, _set: {archived: "${item.archived ? 'false' : 'true'}"}) {id}}`));
                    await onRefresh();
                    setLoading(false);
                  }
                  else if (buttonIndex === options.indexOf('Rename')) {
                    const renameFunction = async (rename) => {
                      setLoading(true);
                      if (rename) {
                        await API.graphql(graphqlOperation(`mutation{update_projects_by_pk(pk_columns: {id: "${item.id}"}, _set: {name: "${rename}"}) {id}}`));
                      }
                      await onRefresh();
                      setLoading(false);
                    }
                    Alert.prompt('Rename', '', async (text) => {
                      await renameFunction(text);
                    }, 'plain-text', item.name);
                  }
                  else if (buttonIndex === options.indexOf('Unfocus') || buttonIndex === options.indexOf('Focus')) {
                    setLoading(true);
                    await API.graphql(graphqlOperation(`mutation{update_projects_by_pk(pk_columns: {id: "${item.id}"}, _set: {focused: "${item.focused ? 'false' : 'true'}"}) {id}}`));
                    await onRefresh();
                    setLoading(false);
                  }
                }
              );
            }, 1000);
          }}
          onDragEnd={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          onDragging={(e) => {
            if (Math.abs(e.vx) > 0.01 || Math.abs(e.vy) > 0.01) {
              clearTimeout(projectContextTimeout);
            }
          }}
          sortable={true}
          dataSource={projects}
          parentWidth={window.width}
          marginChildrenTop={0}
          marginChildrenBottom={40}
          marginChildrenLeft={root.desktopWeb ? (window.width - ((window.width < 600 ? 3 : window.width < 800 ? 4 : 5) * 141)) / (window.width < 600 ? 6 : window.width < 800 ? 8 : 10) : (window.width - (2 * 140)) / 6}
          marginChildrenRight={root.desktopWeb ? (window.width - ((window.width < 600 ? 3 : window.width < 800 ? 4 : 5) * 141)) / (window.width < 600 ? 6 : window.width < 800 ? 8 : 10) : (window.width - (2 * 140)) / 6}
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
              navigation.push('project', { id: item.id })
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

              const addFunction = async (name) => {
                let abbreviation = name.split(' ');
                abbreviation = abbreviation.map(obj => obj[0]).join('');
                setLoading(true);
                let data = await API.graphql(graphqlOperation(`mutation {
                  insert_projects_one(object: {name: "${name}", key: "${abbreviation.toLowerCase()}", description: "add a description here", color: "#${Math.floor(Math.random() * 16777215).toString(16)}"}) {
                    id
                  }
                }`));
                setLoading(false);
                navigation.push('project', { id: data.data.insert_projects_one.id });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              }

              Alert.prompt('new project name?', '', async (name) => {
                await addFunction(name);
              }, 'plain-text');
            }
          }}
          renderItem={(item, index) => (
            item.id ?
              <View
                style={{ alignItems: 'center', width: 140, cursor: 'grab' }}
                key={item.id}>
                <View style={{ width: 140, height: 140, borderColor: item.focused ? '#0099ff' : colors.text, borderWidth: 1, borderRadius: 20, shadowColor: item.focused ? '#0099ff' : '', shadowRadius: item.focused ? 15 : 0, shadowOpacity: item.focused ? 1 : 0 }}>
                  <Animated.Image
                    onLoad={() => { Animated.timing(opacity[index], { toValue: 1, duration: 100, useNativeDriver: false }).start(); }}
                    style={{ opacity: opacity[index], width: 138, height: 138, borderRadius: 19 }}
                    source={{ uri: `https://files.productabot.com/public/${item.image}` }}
                  />
                </View>
                {item.goal &&
                  <View style={{ position: 'absolute', flexDirection: 'row', width: '80%', height: 5, bottom: -8, backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderRadius: 5, alignItems: 'flex-start', alignContent: 'flex-start' }}>
                    <View style={{ height: '100%', backgroundColor: item.color === '#000000' ? colors.text : item.color, width: `${(Math.min(item.entries_aggregate.aggregate.sum.hours / item.goal, 1) * 100).toFixed(0)}%`, borderRadius: 3 }} />
                  </View>}
                <Text numberOfLines={1} ellipsizeMode='tail'>{item.public ? '' : '🔒'}{item.name}</Text>
              </View>
              :
              !archived ?
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 10, width: 140, height: 140 }}>
                  <Text style={{ fontSize: 30 }}>+</Text>
                </View>
                :
                <View />
          )}
        />
      }
      <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer} >
        <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y, left: contextPosition.x } }} />
        <MenuOptions style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderStyle: 'solid', borderRadius: 10, width: 100, paddingLeft: 15, paddingTop: 5, paddingBottom: 5 }}>
          <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
            menuRef.current.close();
            await contextPosition.focus();
            await onRefresh();
          }} ><Text style={{ color: colors.text }}>{contextPosition?.value?.focused ? 'Unfocus' : 'Focus'}</Text></TouchableOpacity>
          <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
            menuRef.current.close();
            await contextPosition.rename();
            await onRefresh();
          }} ><Text style={{ color: colors.text }}>Rename</Text></TouchableOpacity>
          <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
            menuRef.current.close();
            await contextPosition.archive();
            await onRefresh();
          }}><Text style={{ color: contextPosition?.value?.archived ? colors.text : colors.delete }}>{archived ? 'Unarchive' : 'Archive'}</Text></TouchableOpacity>
          <TouchableOpacity style={{ padding: 5, width: '100%', display: contextPosition?.value?.archived ? '' : 'none' }} onPress={async () => {
            menuRef.current.close();
            await contextPosition.delete();
            await onRefresh();
          }}><Text style={{ color: colors.delete }}>Delete</Text></TouchableOpacity>
          <TouchableOpacity style={{ padding: 5, width: '100%' }}
            onPress={() => { menuRef.current.close(); }}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
        </MenuOptions>
      </Menu>
    </View>
  );
}