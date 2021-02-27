import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, Image, LogBox, TextInput } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';

export default function ProjectScreen({ route, navigation }: any) {
    const [state, setState] = useState({
        project: {},
        loading: false,
        colors: []
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
        projects_by_pk(id: "${route.params.id}") {
            id
            name
            image
            description
            key
            color
            timesheets(limit: 10, order_by: {date: desc}) {
              id
              date
              details
              hours
            }
            kanban_projects(limit: 10, order_by: {name: asc}) {
                id
                name
            }
        }
        colors {
            label
            value
        }
        }`));
        setTimeout(() => {
            setState({ ...state, loading: false, project: data.data.projects_by_pk, colors: data.data.colors.map(obj => { return ({ label: obj.label, value: obj.value, color: obj.value }) }) });
        }, 0);
    }

    return (
        <View style={styles.container}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ paddingTop: 40, paddingBottom: 10 }}>
                    <Text>Project</Text>
                </View>}
            <ScrollView
                style={{ maxWidth: 800, width: '100%', height: '100%', padding: 10 }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={state.loading}
                        onRefresh={onRefresh}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
                    {state.project.image ?
                        <Image
                            style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1 }}
                            source={{ uri: `https://files.productabot.com/${state.project.image}` }}
                        />
                        :
                        <View style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1 }} />
                    }
                    <View style={{ width: '75%' }}>
                        <TextInput value={state.project.name} numberOfLines={1} style={[{ fontSize: 40, color: '#ffffff' }, root.desktopWeb && { outlineWidth: 0 }]}
                            onChangeText={(value) => { setState({ ...state, project: { ...state.project, name: value } }); }}
                            onBlur={async () => {
                                await API.graphql(graphqlOperation(`mutation {
                                    update_projects_by_pk(pk_columns: {id: "${state.project.id}"}, _set: {name: "${state.project.name}"}) {
                                      id
                                    }
                                  }`));
                            }}
                        />
                        <TextInput value={state.project.description} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff' }, root.desktopWeb && { outlineWidth: 0 }]}
                            onChangeText={(value) => { setState({ ...state, project: { ...state.project, description: value } }); }}
                            onBlur={async () => {
                                await API.graphql(graphqlOperation(`
                                mutation {
                                    update_projects_by_pk(pk_columns: {id: "${state.project.id}"}, _set: {description: "${state.project.description}"}) {
                                        id
                                    }
                                }`));
                            }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <Text style={{ fontSize: 20, color: '#ffffff' }}>key: </Text>
                                <TextInput value={state.project.key} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff', borderBottomColor: '#ffffff', borderBottomWidth: 1, width: 35 }, root.desktopWeb && { outlineWidth: 0 }]}
                                    onChangeText={(value) => { setState({ ...state, project: { ...state.project, key: value } }); }}
                                    onBlur={async () => {
                                        await API.graphql(graphqlOperation(`
                        mutation {
                            update_projects_by_pk(pk_columns: {id: "${state.project.id}"}, _set: {key: "${state.project.key}"}) {
                                id
                            }
                        }`));
                                    }}
                                />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <Text style={{ fontSize: 20, color: '#ffffff' }}>, color: </Text>
                                <RNPickerSelect
                                    placeholder={{}}
                                    style={{
                                        inputWeb: { ...styles.picker, color: '#ffffff', borderColor: state.project.color, backgroundColor: '#000000', marginTop: 6 },
                                        inputIOS: { ...styles.picker, color: state.project.color, borderColor: state.project.color }
                                    }}
                                    value={state.project.color}
                                    onValueChange={async (value) => {
                                        if (value) {
                                            setState({ ...state, project: { ...state.project, color: value } })
                                            await API.graphql(graphqlOperation(`
                                        mutation {
                                            update_projects_by_pk(pk_columns: {id: "${state.project.id}"}, _set: {color: "${value}"}) {
                                                id
                                            }
                                        }`));
                                        }
                                    }}
                                    items={state.colors}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <View style={[{ width: '100%' }, root.desktopWeb && { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }]}>
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                            <Text style={{ fontSize: 20 }}>timesheet entries</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    navigation.navigate('timesheet', { screen: 'entry', params: { project_id: state.project.id } })
                                }}
                            ><Text style={{ fontSize: 30 }}>+</Text></TouchableOpacity>
                        </View>
                        <FlatList
                            style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#ffffff' }}
                            numColumns={1}
                            data={state.project.timesheets}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{`${new Date(item.date).toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })}`}</Text>
                                    <Text style={{ fontSize: 14, width: '60%' }}>{`${item.details}`}</Text>
                                    <Text style={{ fontSize: 14, width: '20%', textAlign: 'right' }}>{`${item.hours} hours`}</Text>
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
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                            <Text style={{ fontSize: 20 }}>kanban boards</Text>
                            <TouchableOpacity
                                onPress={async () => {
                                    setState({ ...state, loading: true });
                                    let count = await API.graphql(graphqlOperation(`{
                                        kanban_projects_aggregate(where: {project_id: {_eq: "${state.project.id}"}}) {
                                          aggregate {
                                            max {
                                              name
                                            }
                                          }
                                        }
                                      }`));
                                    let data = await API.graphql(graphqlOperation(`mutation {
                                        insert_kanban_projects_one(object: {name: "${state.project.key + ' board ' + (parseInt(count.data.kanban_projects_aggregate.aggregate.max.name ? count.data.kanban_projects_aggregate.aggregate.max.name.slice(-1) : '0') + 1)}", kanban_columns: {data: [{name: "To-do", order: 0},{name: "In Progress", order: 1},{name: "Done", order: 2}]}, project_id: "${state.project.id}"}) {
                                          id
                                        }
                                      }`));
                                    setState({ ...state, loading: false });
                                    navigation.navigate('kanban', { id: data.data.insert_kanban_projects_one.id })
                                }}
                            ><Text style={{ fontSize: 30 }}>+</Text></TouchableOpacity>
                        </View>
                        <FlatList
                            style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#ffffff' }}
                            numColumns={1}
                            data={state.project.kanban_projects}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity key={index} onPress={() => { navigation.navigate('kanban', { id: item.id }) }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '100%' }}>{`${item.name}`}</Text>
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
                </View>
                <View style={[{ width: '100%' }, root.desktopWeb && { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }]}>
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <Text style={{ fontSize: 20, marginTop: 20, width: '100%' }}>documents</Text>
                        <FlatList
                            style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#ffffff' }}
                            numColumns={1}
                            data={[]}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item}
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
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <Text style={{ fontSize: 20, marginTop: 20, width: '100%' }}>reminders</Text>
                        <FlatList
                            style={{ width: '100%', height: 150, borderWidth: 1, borderColor: '#ffffff' }}
                            numColumns={1}
                            data={[]}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item}
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
                </View>
                <TouchableOpacity style={{ margin: 20 }} onPress={async () => {
                    setState({ ...state, loading: true });
                    await API.graphql(graphqlOperation(`mutation {
                        delete_projects_by_pk(id: "${state.project.id}") {
                          id
                        }
                      }
                      `));
                    setState({ ...state, loading: false });
                    navigation.navigate('projects');
                }}><Text style={{ color: '#ff0000' }}>delete project</Text></TouchableOpacity>
            </ScrollView>
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
    picker: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20 }
});
