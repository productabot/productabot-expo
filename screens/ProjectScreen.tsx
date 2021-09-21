import React, { useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, Image, TextInput, useWindowDimensions, SafeAreaView, Platform, Alert } from 'react-native';
import { Text, View } from '../components/Themed';
import { Auth, API, graphqlOperation, Storage } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { WebView } from 'react-native-webview';
import { CustomDraggableFlatList } from '../components/CustomDraggableFlatList';

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

let timeout: any;
let dragRefTimeout: any;
export default function ProjectScreen({ route, navigation, refresh }: any) {
    const window = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [project, setProject] = useState({ kanban_projects: [], documents: [] });
    const [index, setIndex] = useState(0);
    const [contextPosition, setContextPosition] = useState({ x: 0, y: 0, delete: () => { } });
    const menuRef = useRef(null);
    const inputRef = useRef(null);
    const [settings, setSettings] = useState(false);
    const [count, setCount] = useState({});

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
        projects_by_pk(id: "${route.params.id}") {
            id
            name
            image
            description
            key
            color
            public
            goal
            website
            timesheets(order_by: {date: desc}, limit: 50) {
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
            files(order_by: {order: asc}) {
              id
              name
              type
              size
              order
            }
        }
        timesheets_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
            aggregate {
              count
              sum { hours }
            }
        }
        kanban_projects_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
            aggregate {
              count
            }
        }
        documents_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
            aggregate {
              count
            }
        }
        files_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
            aggregate {
              count
              sum { size }
            }
        }
        goal_aggregate: timesheets_aggregate(where: {project_id: {_eq: "${route.params.id}"}, date: {_gte: "${dateFromString}", _lte: "${dateToString}"}}) {
            aggregate {
              count
              sum { hours }
            }
        }
        }`));
        setProject(data.data.projects_by_pk);
        setCount({ timesheets: data.data.timesheets_aggregate.aggregate.count, kanban_projects: data.data.kanban_projects_aggregate.aggregate.count, documents: data.data.documents_aggregate.aggregate.count, files: data.data.files_aggregate.aggregate.count, fileSize: data.data.files_aggregate.aggregate.sum.size, timesheetHours: data.data.timesheets_aggregate.aggregate.sum.hours, weeklyGoal: ((data.data.goal_aggregate.aggregate.sum.hours / data.data.projects_by_pk.goal) * 100).toFixed(0) });
        setLoading(false);
    }

    const pickImage = async () => {
        try {
            let selectedMedia = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
            });
            if (!selectedMedia.cancelled) {
                setLoading(true);
                let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 500 } }], { compress: 0, format: ImageManipulator.SaveFormat.JPEG });
                let response = await fetch(media.uri);
                let blob = await response.blob();
                let filename = `${uuidv4()}.jpg`;
                await Storage.put(filename, blob, { contentType: 'image/jpeg', level: 'public' });
                try { project.image && await Storage.remove(project.image); }
                catch (err) { console.log(err); }
                setProject({ ...project, image: filename });
                // let user = await Auth.currentSession(); "us-east-2:${user.getIdToken().payload.sub}/"
                await API.graphql(graphqlOperation(`
                mutation {
                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {image: "${filename}"}) {
                        id
                    }
                }`));
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            console.log(err);
        }
    };

    const addAction = async () => {
        if (index === 0) {
            navigation.navigate('calendar', { screen: 'entry', params: { project_id: project.id } })
        }
        else if (index === 1) {
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
            navigation.navigate('board', { id: data.data.insert_kanban_projects_one.id })
        }
        else if (index === 2) {
            setLoading(true);
            let data = await API.graphql(graphqlOperation(`mutation {
            insert_documents_one(object: {title: "New Document", content: "", order: ${project.documents.length}, project_id: "${project.id}"}) {id}
          }`));
            console.log(data);
            setLoading(false);
            navigation.navigate('document', { id: data.data.insert_documents_one.id })
        }
        else if (index === 3) {
            let file = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false, multiple: false });
            console.log(file);
            if (file.type === 'success') {
                setLoading(true);
                let response = await fetch(file.uri);
                let blob = await response.blob();
                await Storage.put(`${project.id}/${file.name}`, blob, { contentType: blob.type, level: 'private' });
                await API.graphql(graphqlOperation(`mutation {
                    insert_files_one(object: {name: "${file.name}", type: "${blob.type}", size: "${file.size}", order: ${project.files.length}, project_id: "${project.id}"}) {id}
                }`));
                setLoading(false);
                onRefresh();
            }
        }
    }

    return (
        <SafeAreaView style={{
            flex: 1,
            backgroundColor: '#000000',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: Platform.OS === 'web' ? -40 : 0
        }}>
            <View style={{ maxWidth: Math.min(window.width, root.desktopWidth), width: '100%', padding: 10, height: '100%' }}>
                {Platform.OS !== 'web' ? <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: -5, marginBottom: 5 }}>
                    <TouchableOpacity onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setSettings(!settings); }} ><Text style={{ fontSize: 30, marginTop: 3 }}>⚙️</Text></TouchableOpacity>
                </View> : <View style={{ height: 80 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {Platform.OS === 'web' && <TouchableOpacity style={{ marginRight: 10 }} onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>}
                        <TouchableOpacity onPress={() => { pickImage(); }}>
                            {project.image ?
                                <Image
                                    style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1, borderRadius: 10 }}
                                    source={{ uri: `https://files.productabot.com/public/${project.image}` }}
                                />
                                :
                                <View style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1, borderRadius: 10 }} />
                            }
                        </TouchableOpacity>
                        <View>
                            <TextInput inputAccessoryViewID='main' spellCheck={false} value={project.name} numberOfLines={1} style={[{ fontSize: 40, color: '#ffffff' }, root.desktopWeb && { outlineWidth: 0 }]}
                                onChangeText={(value) => { setProject({ ...project, name: value }); }}
                                onBlur={async () => {
                                    await API.graphql(graphqlOperation(`mutation {
                                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {name: "${project.name}"}) {
                                      id
                                    }
                                  }`));
                                }}
                            />
                            <TextInput inputAccessoryViewID='main' spellCheck={false} value={project.description} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff' }, root.desktopWeb && { outlineWidth: 0 }]}
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
                        </View>
                    </View>
                    {Platform.OS === 'web' && <TouchableOpacity onPress={() => { setSettings(!settings); }} ><Text style={{ fontSize: 30 }}>⚙️</Text></TouchableOpacity>}
                </View>
                {settings ?
                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, color: '#ffffff' }}>key: </Text>
                            <TextInput inputAccessoryViewID='main' spellCheck={false} value={project.key} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff', borderBottomColor: '#ffffff', borderBottomWidth: 1, width: 60 }, root.desktopWeb && { outlineWidth: 0 }]}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, color: '#ffffff' }}>color: </Text>
                            {Platform.OS === 'web' ?
                                <input style={{ border: 'none' }} type="color" value={project.color} onChange={(e) => {
                                    let value = e.target.value;
                                    clearTimeout(timeout);
                                    timeout = setTimeout(async () => {
                                        await API.graphql(graphqlOperation(`
                                            mutation {
                                                update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {color: "${value}"}) {
                                                    id
                                                }
                                            }`));
                                        setProject({ ...project, color: value });
                                    }, 1000);
                                }} />
                                :
                                <View style={{ width: 100, height: 35 }}>
                                    <WebView
                                        style={{ backgroundColor: 'transparent' }}
                                        ref={inputRef}
                                        source={{
                                            html: `
                                                    <head>
                                                    <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=no;" />
                                                    </head>
                                                    <body style="background-color:#000000;">
                                                    <input id="editor" onchange="window.ReactNativeWebView.postMessage(document.querySelector('#editor').value)" type="color" value="${project.color}"/>
                                                    </body>
                                                `}}
                                        keyboardDisplayRequiresUserAction={false}
                                        showsHorizontalScrollIndicator={false}
                                        scrollEnabled={false}
                                        scalesPageToFit={false}
                                        javaScriptEnabled={true}
                                        automaticallyAdjustContentInsets={false}
                                        onMessage={async (e) => {
                                            let value = e.nativeEvent.data;
                                            await API.graphql(graphqlOperation(`
                                                mutation {
                                                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {color: "${value}"}) {
                                                        id
                                                    }
                                                }`));
                                            setProject({ ...project, color: value });
                                        }}
                                    />
                                </View>
                            }
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, color: '#ffffff' }}>monthly goal: </Text>
                            <TextInput inputAccessoryViewID='main' spellCheck={false} value={`${project.goal}`} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff', borderBottomColor: '#ffffff', borderBottomWidth: 1, width: 40 }, root.desktopWeb && { outlineWidth: 0 }]}
                                onChangeText={(value) => { setProject({ ...project, goal: value }); }}
                                onBlur={async () => {
                                    await API.graphql(graphqlOperation(`
                        mutation {
                            update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {goal: "${project.goal}"}) {
                                id
                            }
                        }`));
                                }}
                            />
                            <Text style={{ fontSize: 20, color: '#ffffff' }}> hours</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, color: '#ffffff' }}>website: </Text>
                            <TextInput inputAccessoryViewID='main' spellCheck={false} value={project.website} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff', borderBottomColor: '#ffffff', borderBottomWidth: 1, width: 300 }, root.desktopWeb && { outlineWidth: 0 }]}
                                onChangeText={(value) => { setProject({ ...project, website: value }); }}
                                onBlur={async () => {
                                    await API.graphql(graphqlOperation(`
                        mutation {
                            update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {website: "${project.website}"}) {
                                id
                            }
                        }`));
                                }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, color: '#ffffff' }}>public: </Text>
                            <TouchableOpacity onPress={async () => {
                                setProject({ ...project, public: !project.public });
                                await API.graphql(graphqlOperation(`
                            mutation {
                                update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {public: ${!project.public ? 'true' : 'false'}}) {
                                id
                            }
                        }`));
                            }} style={{ borderWidth: 1, borderColor: '#ffffff', borderRadius: 2, height: 20, width: 20, marginRight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>{project.public && '✓'}</Text></TouchableOpacity>
                        </View>
                    </View>
                    :
                    <>
                        <SegmentedControl
                            appearance='dark'
                            style={{ width: '100%', marginTop: 10, marginBottom: 10 }}
                            values={[`entries (${count.timesheets ?? 0})`, `boards (${count.kanban_projects ?? 0})`, `docs (${count.documents ?? 0})`, `files (${count.files ?? 0})`]}
                            selectedIndex={index}
                            onChange={(e) => { setIndex(e.nativeEvent.selectedSegmentIndex) }}
                        />
                        <View style={{ width: '100%', height: window.height - (Platform.OS === 'web' ? 280 : 300) }}>
                            {(index === 0 && count.timesheetHours) && <Text style={{ alignSelf: 'flex-start', marginBottom: -20, marginLeft: 5 }}>{`${count.timesheetHours} hours ${root.desktopWeb ? `(${(count.timesheetHours / 8).toFixed(2)} days)` : ``}`}</Text>}
                            {(index === 0 && project.goal && root.desktopWeb) &&
                                <View style={{ flexDirection: 'row', width: 320, alignSelf:'center', alignItems:'center', marginBottom: -15, marginRight: -40 }}>
                                    <View style={{ flexDirection: 'row', width: 200, height: 15, backgroundColor: '#000000', borderColor: '#666666', borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center' }}>
                                        <View style={{ height: '100%', backgroundColor: project.color === '#000000' ? '#ffffff' : project.color, width: `${count.weeklyGoal}%`, borderRadius: 5 }} />
                                    </View>
                                    <Text style={{ alignSelf: 'center', marginLeft: 5 }}>{`${count.weeklyGoal}% of goal`}</Text>
                                </View>
                            }
                            {(index === 0 && project.goal && !root.desktopWeb) && <Text style={{ alignSelf: 'center', marginBottom: -20, marginLeft: 5 }}>{`${count.weeklyGoal}%`}</Text>}
                            {(index === 3 && count.fileSize) && <Text style={{ alignSelf: 'flex-start', marginBottom: -20, marginLeft: 5 }}>storage used: {formatBytes(count.fileSize)}</Text>}
                            <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5 }}
                                onPress={async () => { addAction(); }}
                            ><Text>{index === 0 ? 'add time entry' : index === 1 ? 'add kanban board' : index === 2 ? 'add project doc' : index === 3 ? 'upload a file' : ''} +</Text></TouchableOpacity>
                            {index === 0 &&
                                <FlatList
                                    style={[{ height: '100%' }, Platform.OS === 'web' && { borderColor: '#333333', borderWidth: 1, borderStyle: 'solid', borderRadius: 10, padding: Platform.OS === 'web' ? 10 : 0 }]}
                                    numColumns={1}
                                    data={project.timesheets}
                                    renderItem={({ item, index }) => {
                                        let date = new Date(item.date);
                                        date.setDate(date.getDate() + 1)
                                        return (
                                            <TouchableOpacity onPress={() => {
                                                navigation.navigate('calendar', { screen: 'entry', params: { id: item.id } })
                                            }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 5, borderRadius: 10, backgroundColor: '#161616' }}>
                                                <View style={{ width: '30%', flexDirection: 'column', justifyContent: 'flex-start' }}>
                                                    <Text style={{ fontSize: 14 }}>{`⏱️ ${date.toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })}`}</Text>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                        <View style={{ backgroundColor: '#444444', borderRadius: 10, paddingLeft: 7.5, paddingRight: 7.5, paddingTop: 2.5, paddingBottom: 2.5, marginTop: 5, marginLeft: root.desktopWeb ? 15 : 0 }}>
                                                            <Text style={{ fontSize: 14 }}>{item.category ? item.category : ''}</Text>
                                                        </View>
                                                        <View />
                                                    </View>
                                                </View>
                                                <Text style={{ fontSize: 14, width: '50%' }}>{`${item.details}`}</Text>
                                                <Text style={{ fontSize: 14, width: '20%', textAlign: 'right' }}>{`${item.hours} hours`}</Text>
                                            </TouchableOpacity>
                                        )
                                    }}
                                    keyExtractor={item => item.id}
                                    onEndReached={() => { }}
                                    ListEmptyComponent={
                                        <TouchableOpacity
                                            onPress={async () => { addAction(); }}
                                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 10, borderRadius: 10, backgroundColor: '#161616' }}>
                                            <Text style={{ fontSize: 14, width: '100%', textAlign: 'center' }}>{`add an entry +`}</Text>
                                        </TouchableOpacity>}
                                />
                            }
                            {index === 1 &&
                                <CustomDraggableFlatList
                                    data={project.kanban_projects}
                                    renderItem={(item) =>
                                        <>
                                            <Text style={{ fontSize: 14, width: '75%' }}>📌 {`${item.item.name}`}</Text>
                                            <Text style={{ fontSize: 14, width: '20%' }}>{`${item.item.kanban_columns[2].kanban_items_aggregate.aggregate.count}/${item.item.kanban_columns[0].kanban_items_aggregate.aggregate.count + item.item.kanban_columns[1].kanban_items_aggregate.aggregate.count + item.item.kanban_columns[2].kanban_items_aggregate.aggregate.count} done`}</Text>
                                            <Text style={{ fontSize: 14, width: '5%' }}>☰</Text>
                                        </>
                                    }
                                    onPress={async (item) => { navigation.navigate('board', { id: item.item.id }) }}
                                    ListEmptyComponent={
                                        <TouchableOpacity
                                            onPress={async () => { addAction(); }}
                                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 10, backgroundColor: '#161616' }}>
                                            <Text style={{ fontSize: 14, width: '100%', textAlign: 'center' }}>{`add a board +`}</Text>
                                        </TouchableOpacity>}
                                    onDragEnd={async ({ data }) => {
                                        setProject({ ...project, kanban_projects: data });
                                        await API.graphql(graphqlOperation(`mutation {
                                    ${data.map((kanban, kanbanIndex) => `data${kanbanIndex}: update_kanban_projects_by_pk(pk_columns: {id: "${kanban.id}"}, _set: {order: ${kanbanIndex}}) {id}`)}
                                }`));
                                    }}
                                />
                            }

                            {index === 2 &&
                                <CustomDraggableFlatList
                                    data={project.documents}
                                    renderItem={(item) =>
                                        <>
                                            <Text style={{ fontSize: 14, width: '75%' }}>📄 {`${item.item.title}`}</Text>
                                            <Text style={{ fontSize: 14, width: '5%' }}>☰</Text>
                                        </>
                                    }
                                    onPress={async (item) => {
                                        navigation.navigate('document', { id: item.item.id })
                                    }}
                                    ListEmptyComponent={
                                        <TouchableOpacity
                                            onPress={async () => { addAction(); }}
                                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, marginBottom: 10, borderRadius: 10, backgroundColor: '#161616' }}>
                                            <Text style={{ fontSize: 14, width: '100%', textAlign: 'center' }}>{`add a document +`}</Text>
                                        </TouchableOpacity>}
                                    onDragEnd={async ({ data }) => {
                                        setProject({ ...project, documents: data });
                                        await API.graphql(graphqlOperation(`mutation {
                                    ${data.map((document, documentIndex) => `data${documentIndex}: update_documents_by_pk(pk_columns: {id: "${document.id}"}, _set: {order: ${documentIndex}}) {id}`)}
                                }`));
                                    }}
                                />
                            }

                            {index === 3 &&
                                <CustomDraggableFlatList
                                    data={project.files}
                                    renderItem={(item) =>
                                        <>
                                            <Text style={{ fontSize: 14, width: '70%' }}>📄 {`${item.item.name}`}</Text>
                                            <Text style={{ fontSize: 14, width: '20%' }}>{`${formatBytes(item.item.size)}`}</Text>
                                            <Text style={{ fontSize: 14, width: '5%' }}>☰</Text>
                                        </>
                                    }
                                    onPress={async (item) => {
                                        let link = await Storage.get(`${project.id}/${item.item.name}`, { level: 'private', expires: 10 });
                                        await WebBrowser.openBrowserAsync(link.replace('https://pbot-prod-files.s3.us-east-2.amazonaws.com', 'https://files.productabot.com'));
                                    }}
                                    ListEmptyComponent={
                                        <TouchableOpacity
                                            onPress={async () => { addAction(); }}
                                            style={{ cursor: 'grab', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 5, borderRadius: 10, backgroundColor: '#161616' }}>
                                            <Text style={{ fontSize: 14, width: '100%', textAlign: 'center' }}>{`upload a file +`}</Text>
                                        </TouchableOpacity>}
                                    onDragEnd={async ({ data }) => {
                                        setProject({ ...project, files: data });
                                        await API.graphql(graphqlOperation(`mutation {
                                        ${data.map((file, fileIndex) => `data${fileIndex}: update_files_by_pk(pk_columns: {id: "${file.id}"}, _set: {order: ${fileIndex}}) {id}`)}
                                    }`));
                                    }}
                                />}
                        </View>
                    </>}
            </View>
            {loading && <LoadingComponent />}
            <InputAccessoryViewComponent />
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer}>
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y, left: contextPosition.x } }} />
                <MenuOptions customStyles={{ optionsWrapper: { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderStyle: 'solid', width: 100 }, optionsContainer: { width: 100 } }}>
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, paddingLeft: 20, width: '100%' }} onPress={() => {
                            Alert.prompt('hey');
                        }} ><Text>Rename</Text></TouchableOpacity>
                        <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 20, width: '100%' }} onPress={async () => {
                            menuRef.current.close();
                            await contextPosition.delete();
                            await onRefresh();
                        }}><Text>Delete</Text></TouchableOpacity>
                        <TouchableOpacity style={{ backgroundColor: '#000000', padding: 5, paddingLeft: 20, width: '100%' }}
                            onPress={() => { menuRef.current.close(); }}><Text>Cancel</Text></TouchableOpacity>
                    </View>
                </MenuOptions>
            </Menu>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    picker: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20 }
});