import React, { useState, useRef } from 'react';
import { TouchableOpacity, RefreshControl, Image, useWindowDimensions, SafeAreaView, Platform } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, navItem } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import AutoDragSortableView from '../components/AutoDragSortableViewComponent';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import * as Haptics from 'expo-haptics';

export default function ProjectsScreen({ route, navigation, refresh }: any) {
  const window = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [hover, setHover] = useState({});
  const [contextPosition, setContextPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!route.params) { route.params = {}; }
      onRefresh();
    }, [refresh])
  );

  let onRefresh = async () => {
    setLoading(true);

    let dateFrom = new Date();
    dateFrom.setDate(1);
    let dateFromString = dateFrom.toISOString().split('T')[0];
    let dateTo = new Date();
    dateTo.setMonth(dateTo.getMonth() + 1);
    dateTo.setDate(0);
    let dateToString = dateTo.toISOString().split('T')[0];

    let data = await API.graphql(graphqlOperation(`{
      projects(order_by: {order: asc}) {
        id
        name
        image
        goal
        color
        public
        timesheets_aggregate(where: {date: {_gte: "${dateFromString}", _lte: "${dateToString}"}}) {
          aggregate {
            sum {
              hours
            }
          }
        }
      }
    }
    `));
    setProjects(data.data.projects.concat({ id: null }));
    setLoading(false);
  }

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: '#000000',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: root.desktopWeb ? 30 : 0
    }}>
      {/* <View style={{ marginTop: root.desktopWeb ? 40 : 20, width: '100%', paddingLeft: 40, paddingRight: 40, maxWidth: root.desktopWidth }}>
        <Text style={{ color: '#ffffff', fontSize: 30 }}>Hi there, Chris</Text>
      </View> */}
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
        minOpacity={100}
        maxScale={1.1}
        delayLongPress={100}
        onDragStart={() => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
        onDragEnd={() => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        sortable={true}
        dataSource={projects}
        parentWidth={root.desktopWeb ? Math.min(window.width, root.desktopWidth) : window.width}
        marginChildrenTop={30}
        marginChildrenBottom={30}
        marginChildrenLeft={root.desktopWeb ? (Math.min(window.width, root.desktopWidth) - (5 * 140)) / 12 : (window.width - (2 * 140)) / 6}
        marginChildrenRight={root.desktopWeb ? (Math.min(window.width, root.desktopWidth) - (5 * 140)) / 12 : (window.width - (2 * 140)) / 6}
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
              onContextMenu={(e) => { e.preventDefault(); setContextPosition({ x: e.pageX, y: e.pageY }); menuRef.current.open(); }}
              onMouseEnter={() => { setHover({ ...hover, [item.id]: true }) }}
              onMouseLeave={() => { setHover({ ...hover, [item.id]: false }) }}
              onPress={() => { navigation.navigate('project', { id: item.id }) }}
              style={{ alignItems: 'center', margin: 10, marginLeft: 20, marginRight: 20, width: 140 }}
              key={item.id}>
              {item.image ?
                <Image
                  style={{ width: 140, height: 140, borderColor: '#ffffff', borderWidth: 1, borderRadius: 20 }}
                  source={{ uri: `https://files.productabot.com/public/${item.image}` }}
                />
                :
                <View style={{ width: 140, height: 140, borderColor: '#ffffff', borderWidth: 1, borderRadius: 20 }} />
              }
              {item.goal &&
                <View style={{ position: 'absolute', flexDirection: 'row', width: '80%', height: 5, bottom: -8, backgroundColor: '#000000', borderColor: '#666666', borderWidth: 1, borderRadius: 5, alignItems: 'flex-start', alignContent: 'flex-start' }}>
                  <View style={{ height: '100%', backgroundColor: item.color === '#000000' ? '#ffffff' : item.color, width: `${((item.timesheets_aggregate.aggregate.sum.hours / item.goal) * 100).toFixed(0)}%`, borderRadius: 5 }} />
                </View>}
              <Text numberOfLines={1} ellipsizeMode='tail'>{item.public ? '' : '🔒'}{item.name}</Text>
            </View>

            :
            <View
              onContextMenu={(e) => { e.preventDefault(); }}
              onMouseEnter={() => { setHover({ ...hover, [item.id]: true }) }}
              onMouseLeave={() => { setHover({ ...hover, [item.id]: false }) }}
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
      {loading && <LoadingComponent />}
      <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer}>
        <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y, left: contextPosition.x } }} />
        <MenuOptions customStyles={{ optionsWrapper: { backgroundColor: '#000000', borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', width: 100 }, optionsContainer: { width: 100 } }}>
          <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, paddingLeft: 20, width: '100%' }} onPress={() => {
            }} ><Text>Rename</Text></TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 20, width: '100%' }} onPress={async () => {
            }}><Text>Archive</Text></TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#000000', padding: 5, paddingLeft: 20, width: '100%' }}
              onPress={() => { menuRef.current.close(); }}><Text>Cancel</Text></TouchableOpacity>
          </View>
        </MenuOptions>
      </Menu>
    </SafeAreaView>
  );
}