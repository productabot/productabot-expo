import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, Image, TextInput, useWindowDimensions } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import DraggableFlatList from 'react-native-draggable-flatlist';

export default function ProjectScreen({ route, navigation, refresh }: any) {
    const window = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [project, setProject] = useState({ kanban_projects: [], documents: [] });
    const [colors, setColors] = useState([]);


    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [refresh])
    );

    let onRefresh = async () => {
        setLoading(true);
        let data = await API.graphql(graphqlOperation(`{
        projects_by_pk(id: "${route.params.id}") {
            id
            name
            image
            description
            key
            color
            timesheets(order_by: {date: desc}) {
              id
              date
              category
              details
              hours
            }
            kanban_projects(order_by: {order: asc}) {
                id
                name
                kanban_columns(order_by: {order: asc}) {
                        name
                        kanban_items_aggregate {
                        aggregate {
                            count
                        }
                    }
                }
            }
            documents(order_by: {order: asc}) {
              id
              title
            }
        }
        colors {
            label
            value
        }
        }`));
        setProject(data.data.projects_by_pk);
        setColors(data.data.colors.map(obj => { return ({ label: obj.label, value: obj.value, color: obj.value }) }));
        setLoading(false);
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
                style={{ maxWidth: Math.min(window.width, root.desktopWidth), width: '100%', height: 0, padding: 10 }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={onRefresh}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
                    {project.image ?
                        <Image
                            style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1 }}
                            source={{ uri: `https://files.productabot.com/${project.image}` }}
                        />
                        :
                        <View style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1 }} />
                    }
                    <View style={{ width: '75%' }}>
                        <TextInput spellCheck={false} value={project.name} numberOfLines={1} style={[{ fontSize: 40, color: '#ffffff' }, root.desktopWeb && { outlineWidth: 0 }]}
                            onChangeText={(value) => { setProject({ ...project, name: value }); }}
                            onBlur={async () => {
                                await API.graphql(graphqlOperation(`mutation {
                                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {name: "${project.name}"}) {
                                      id
                                    }
                                  }`));
                            }}
                        />
                        <TextInput spellCheck={false} value={project.description} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff' }, root.desktopWeb && { outlineWidth: 0 }]}
                            onChangeText={(value) => { setProject({ ...project, description: value }); }}
                            onBlur={async () => {
                                await API.graphql(graphqlOperation(`
                                mutation {
                                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {description: "${project.description}"}) {
                                        id
                                    }
                                }`));
                            }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <Text style={{ fontSize: 20, color: '#ffffff' }}>key: </Text>
                                <TextInput spellCheck={false} value={project.key} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff', borderBottomColor: '#ffffff', borderBottomWidth: 1, width: 35 }, root.desktopWeb && { outlineWidth: 0 }]}
                                    onChangeText={(value) => { setProject({ ...project, key: value }); }}
                                    onBlur={async () => {
                                        await API.graphql(graphqlOperation(`
                        mutation {
                            update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {key: "${project.key}"}) {
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
                                        inputWeb: { ...styles.picker, color: '#ffffff', borderColor: project.color, backgroundColor: '#000000', marginTop: 6 },
                                        inputIOS: { ...styles.picker, color: project.color, borderColor: project.color }
                                    }}
                                    value={project.color}
                                    onValueChange={async (value) => {
                                        if (value) {
                                            setProject({ ...project, color: value });
                                            await API.graphql(graphqlOperation(`
                                        mutation {
                                            update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {color: "${value}"}) {
                                                id
                                            }
                                        }`));
                                        }
                                    }}
                                    items={colors}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <View style={[{ width: '100%' }, root.desktopWeb && { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }]}>
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                            <Text style={{ fontSize: 20 }}>timesheet entries</Text>
                            {(project.id === '20bf19a8-56c9-4d7e-a997-2078fd6c097c') &&
                                <TouchableOpacity
                                    style={{ borderColor: '#ffffff', borderWidth: 1, borderRadius: 10, padding: 5 }}
                                    onPress={async () => {
                                        setLoading(true);
                                        let dateStart = new Date()
                                        // dateStart.setDate(dateStart.getDate() - 7);
                                        let dateStartString = await root.exportDate(new Date(dateStart.setDate((dateStart.getDate() + (1 - dateStart.getDay()) % 7))));
                                        let dateEnd = new Date();
                                        // dateEnd.setDate(dateEnd.getDate() - 7);
                                        let dateEndString = await root.exportDate(new Date(dateEnd.setDate((dateEnd.getDate() + (5 - dateEnd.getDay()) % 7))));

                                        let data = await API.graphql(graphqlOperation(`{
                                            timesheets(where: {project_id: {_eq: "${project.id}"}, date: {_gte: "${dateStartString}", _lte: "${dateEndString}"}}) {
                                              date
                                              category
                                              hours
                                              details
                                            }
                                          }`));

                                        let response = await API.post('1', '/public/submitTimesheet', { body: { timesheets: data.data.timesheets } });
                                        console.log(response);
                                        setLoading(false);
                                        if (response === 'success') {
                                            alert("Successfully submitted entries");
                                        }
                                        else {
                                            alert(`Error: ${JSON.stringify(response)}`);
                                        }
                                    }}
                                ><Text style={{ fontSize: 12 }}>Submit last week</Text></TouchableOpacity>}
                            <TouchableOpacity
                                onPress={() => {
                                    navigation.navigate('calendar', { screen: 'entry', params: { project_id: project.id } })
                                }}
                            ><Text style={{ fontSize: 30 }}>+</Text></TouchableOpacity>
                        </View>
                        <FlatList
                            style={{ width: '100%', height: 250, borderWidth: 1, borderColor: '#ffffff' }}
                            numColumns={1}
                            data={project.timesheets}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity onPress={() => {
                                    navigation.navigate('calendar', { screen: 'entry', params: { id: item.id } })
                                }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '30%' }}>{`${new Date(item.date).toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })}`}{item.category ? '\n' + item.category : ''}</Text>
                                    <Text style={{ fontSize: 14, width: '50%' }}>{`${item.details}`}</Text>
                                    <Text style={{ fontSize: 14, width: '20%', textAlign: 'right' }}>{`${item.hours} hours`}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item.id}
                            refreshControl={
                                <RefreshControl
                                    refreshing={loading}
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
                                    setLoading(true);
                                    let count = await API.graphql(graphqlOperation(`{
                                        kanban_projects_aggregate(where: {project_id: {_eq: "${project.id}"}}) {
                                          aggregate {
                                            max {
                                              name
                                            }
                                            count
                                          }
                                        }
                                      }`));
                                    let data = await API.graphql(graphqlOperation(`mutation {
                                        insert_kanban_projects_one(object: {name: "${project.key + ' board ' + (parseInt(count.data.kanban_projects_aggregate.aggregate.max.name ? !isNaN(count.data.kanban_projects_aggregate.aggregate.max.name.slice(-1)) ? count.data.kanban_projects_aggregate.aggregate.max.name.slice(-1) : count.data.kanban_projects_aggregate.aggregate.count : count.data.kanban_projects_aggregate.aggregate.count) + 1)}", description:"add a description here", kanban_columns: {data: [{name: "To-do", order: 0},{name: "In Progress", order: 1},{name: "Done", order: 2}]}, project_id: "${project.id}"}) {
                                          id
                                        }
                                      }`));
                                    setLoading(false);
                                    navigation.navigate('kanban', { id: data.data.insert_kanban_projects_one.id })
                                }}
                            ><Text style={{ fontSize: 30 }}>+</Text></TouchableOpacity>
                        </View>
                        <DraggableFlatList
                            style={{ width: '100%', height: 250, borderWidth: 1, borderColor: '#ffffff' }}
                            data={project.kanban_projects}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={(item) => (
                                <TouchableOpacity onPress={() => { navigation.navigate('kanban', { id: item.item.id }) }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '75%' }}>{`${item.item.name}`}</Text>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{`${item.item.kanban_columns[2].kanban_items_aggregate.aggregate.count}/${item.item.kanban_columns[0].kanban_items_aggregate.aggregate.count + item.item.kanban_columns[1].kanban_items_aggregate.aggregate.count + item.item.kanban_columns[2].kanban_items_aggregate.aggregate.count} done`}</Text>
                                    <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={200} onLongPress={item.drag} style={{ width: '5%', cursor: 'grab' }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={loading}
                                    onRefresh={onRefresh}
                                    colors={["#ffffff"]}
                                    tintColor='#ffffff'
                                    titleColor="#ffffff"
                                    title=""
                                />}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                            dragItemOverflow={false}
                            onDragEnd={async ({ data }) => {
                                setProject({ ...project, kanban_projects: data });
                                await API.graphql(graphqlOperation(`mutation {
                                    ${data.map((kanban, kanbanIndex) => `data${kanbanIndex}: update_kanban_projects_by_pk(pk_columns: {id: "${kanban.id}"}, _set: {order: ${kanbanIndex}}) {id}`)}
                                }`));
                            }}
                        />
                    </View>
                </View>
                <View style={[{ width: '100%' }, root.desktopWeb && { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }]}>
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                            <Text style={{ fontSize: 20 }}>documents</Text>
                            <TouchableOpacity
                                onPress={async () => {
                                    setLoading(true);
                                    let data = await API.graphql(graphqlOperation(`mutation {
                                        insert_documents_one(object: {title: "New Document", content: "", order: ${project.documents.length}, project_id: "${project.id}"}) {id}
                                      }`));
                                    console.log(data);
                                    setLoading(false);
                                    navigation.navigate('document', { id: data.data.insert_documents_one.id })
                                }}
                            ><Text style={{ fontSize: 30 }}>+</Text></TouchableOpacity>
                        </View>
                        <DraggableFlatList
                            style={{ width: '100%', height: 250, borderWidth: 1, borderColor: '#ffffff' }}
                            data={project.documents}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={(item) => (
                                <TouchableOpacity onPress={() => { navigation.navigate('document', { id: item.item.id }) }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '75%' }}>{`${item.item.title}`}</Text>
                                    <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={200} onLongPress={item.drag} style={{ width: '5%', cursor: 'grab' }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={loading}
                                    onRefresh={onRefresh}
                                    colors={["#ffffff"]}
                                    tintColor='#ffffff'
                                    titleColor="#ffffff"
                                    title=""
                                />}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                            dragItemOverflow={false}
                            onDragEnd={async ({ data }) => {
                                setProject({ ...project, documents: data });
                                await API.graphql(graphqlOperation(`mutation {
                                    ${data.map((document, documentIndex) => `data${documentIndex}: update_documents_by_pk(pk_columns: {id: "${document.id}"}, _set: {order: ${documentIndex}}) {id}`)}
                                }`));
                            }}
                        />
                    </View>
                    <View style={root.desktopWeb && { width: '49%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                            <Text style={{ fontSize: 20 }}>reminders</Text>
                            <TouchableOpacity
                                onPress={async () => {
                                }}
                            ><Text style={{ fontSize: 30 }}>+</Text></TouchableOpacity>
                        </View>
                        <DraggableFlatList
                            style={{ width: '100%', height: 250, borderWidth: 1, borderColor: '#ffffff' }}
                            data={[]}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={(item) => (
                                <TouchableOpacity onPress={() => { navigation.navigate('document', { id: item.item.id }) }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '75%' }}>{`${item.item.title}`}</Text>
                                    <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={200} onLongPress={item.drag} style={{ width: '5%', cursor: 'grab' }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={loading}
                                    onRefresh={onRefresh}
                                    colors={["#ffffff"]}
                                    tintColor='#ffffff'
                                    titleColor="#ffffff"
                                    title=""
                                />}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                            dragItemOverflow={false}
                            onDragEnd={async ({ data }) => {
                                // setProject({ ...project, documents: data });
                                // await API.graphql(graphqlOperation(`mutation {
                                //     ${data.map((document, documentIndex) => `data${documentIndex}: update_documents_by_pk(pk_columns: {id: "${document.id}"}, _set: {order: ${documentIndex}}) {id}`)}
                                // }`));
                            }}
                        />
                    </View>
                </View>
                <TouchableOpacity style={{ margin: 20 }} onPress={async () => {
                    setLoading(true);
                    await API.graphql(graphqlOperation(`mutation {
                        delete_projects_by_pk(id: "${project.id}") {
                          id
                        }
                      }
                      `));
                    setLoading(false);
                    navigation.navigate('projects');
                }}><Text style={{ color: '#ff0000' }}>delete project</Text></TouchableOpacity>
            </ScrollView>
            { loading && <LoadingComponent />}
        </View >
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
