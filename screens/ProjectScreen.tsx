import React, { useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Image, TextInput, useWindowDimensions, Platform, Alert, Animated, Easing } from 'react-native';
import { Text, View } from '../components/Themed';
import { Storage } from "@aws-amplify/storage";
import { API, graphqlOperation } from "@aws-amplify/api";
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
import Popover from '../components/PopoverMenuRenderer';
import { PieChart } from "react-native-chart-kit";
import * as Haptics from 'expo-haptics';
import { useTheme } from '@react-navigation/native';
import { MultipleContainers } from '../components/dndkit/MultipleContainers';
import TasksScreen from './TasksScreen';
import TasksDesktopScreen from './TasksDesktopScreen';
const chartColors = ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
    '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
    '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A',
    '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
    '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC',
    '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
    '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680',
    '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
    '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3',
    '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF'];

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

let timeout: any;
let goalTimeout: any;

let dateFrom = new Date();
dateFrom.setDate(1);
const dateFromString = dateFrom.toISOString().split('T')[0];
let dateTo = new Date();
dateTo.setMonth(dateTo.getMonth() + 1);
dateTo.setDate(0);
const dateToString = dateTo.toISOString().split('T')[0];

let uploadTimeout: any;
let dropFunction = async (e) => { };

export default function ProjectScreen({ route, navigation, refresh, setLoading }: any) {
    const window = useWindowDimensions();
    const [project, setProject] = useState({ tasks: [], files: [], entries: [], files: [] });
    const [index, setIndex] = useState(0);
    const [contextPosition, setContextPosition] = useState({ x: 0, y: 0, rename: () => { }, delete: () => { } });
    const menuRef = useRef(null);
    const goalRef = useRef(null);
    const inputRef = useRef(null);
    const [settings, setSettings] = useState(false);
    const [count, setCount] = useState({});
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (Platform.OS === 'web') {
            dropFunction = async (e) => {
                let files = e.dataTransfer.files;
                clearTimeout(uploadTimeout);
                uploadTimeout = setTimeout(async () => {
                    setLoading(true);
                    for (const file of files) {
                        // const blob = new Blob([file], { type: file.type });
                        await Storage.put(`${project.id}/${file.name}`, file, { contentType: file.type, level: 'private' });
                        await API.graphql(graphqlOperation(`mutation {
                        insert_files_one(object: {title: "${file.name}", type: "${file.type}", size: "${file.size}", order: ${project.files.length}, project_id: "${project.id}"}) {id}
                        }`));
                    }
                    setLoading(false);
                    onRefresh();
                }, 100);
            }
            const dropzone = document.getElementById('root');
            ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(function (event) {
                dropzone.addEventListener(event, function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            dropzone.addEventListener('drop', dropFunction, false);
        }
    }, [project]);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
            return () => {
                // if (Platform.OS === 'web') {
                //     const dropzone = document.getElementById('root');
                //     dropzone.removeEventListener('drop', dropFunction, false);
                // }
            }
        }, [refresh, route.params])
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
            public
            goal
            website
            entries(order_by: {date: desc}, limit: 50) {
              id
              date
              category
              details
              hours
            }
            tasks(order_by: {order: desc}, limit: 50) {
              id
              created_at
              category
              details
              comments_aggregate {
                  aggregate {
                      count
                  }
              }
            }
            files(order_by: {order: asc}) {
              id
              title
              type
              size
              order
            }
            events(order_by: {date_from: desc}, limit: 50) {
              id
              date_from
              date_to
              category
              details
            }
        }
        entries_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
            aggregate {
              count
              sum { hours }
            }
        }
        tasks_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
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
        events_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
            aggregate {
              count
            }
        }
        goal_aggregate: entries_aggregate(where: {project_id: {_eq: "${route.params.id}"}, date: {_gte: "${dateFromString}", _lte: "${dateToString}"}}) {
            aggregate {
              count
              sum { hours }
            }
        }
        }`));
        setProject(data.data.projects_by_pk);
        setCount({ events: data.data.events_aggregate.aggregate.count, entries: data.data.entries_aggregate.aggregate.count, tasks: data.data.tasks_aggregate.aggregate.count, files: data.data.files_aggregate.aggregate.count, fileSize: data.data.files_aggregate.aggregate.sum.size, timesheetHours: data.data.entries_aggregate.aggregate.sum.hours, weeklyGoal: ((data.data.goal_aggregate.aggregate.sum.hours / data.data.projects_by_pk.goal) * 100).toFixed(0), weeklyGoalHours: data.data.goal_aggregate.aggregate.sum.hours });
        setLoading(false);
        Animated.sequence([Animated.timing(opacity, { toValue: 1, duration: Platform.OS === 'web' ? 1 : 100, easing: Easing.linear, useNativeDriver: true })]).start();
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
                let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 500 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
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

    const addAction = async (type) => {
        if (type === 'entry') {
            navigation.push('entry', { project_id: project.id })
        }
        else if (type === 'task') {
            navigation.push('edit_task', { project_id: project.id })
        }
        else if (type === 'document') {
            setLoading(true);
            let data = await API.graphql(graphqlOperation(`mutation {
            insert_files_one(object: {title: "New Document", content: "", order: ${project.files.length}, project_id: "${project.id}"}) {id}
          }`));
            setLoading(false);
            navigation.push('document', { id: data.data.insert_files_one.id })
        }
        else if (type === 'sheet') {
            if (Platform.OS === 'web') {
                setLoading(true);
                let data = await API.graphql(graphqlOperation(`mutation {
                    insert_files_one(object: {title: "New Sheet", content: "", order: ${project.files.length}, project_id: "${project.id}", type: "sheet"}) {id}
                }`));
                setLoading(false);
                navigation.push('sheet', { id: data.data.insert_files_one.id })
            }
            else {
                alert('Sorry! Sheets are not supported on the mobile app at this time');
            }
        }
        else if (type === 'file') {
            let file = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false, multiple: false });
            if (file.type === 'success') {
                setLoading(true);
                let response = await fetch(file.uri);
                let blob = await response.blob();
                await Storage.put(`${project.id}/${file.name}`, blob, { contentType: blob.type, level: 'private' });
                await API.graphql(graphqlOperation(`mutation {
                    insert_files_one(object: {title: "${file.name}", type: "${blob.type}", size: "${file.size}", order: ${project.files.length}, project_id: "${project.id}"}) {id}
                }`));
                setLoading(false);
                onRefresh();
            }
        }
        else if (type === 'event') {
            navigation.push('event', { project_id: project.id })
        }
    }

    return (
        <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: Platform.OS === 'web' ? -30 : 0
        }}>
            <View style={{ maxWidth: window.width, width: '100%', padding: 10, height: '100%', paddingTop: 0 }}>
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
                                    style={{ width: 80, height: 80, marginRight: 10, borderColor: colors.text, borderWidth: 1, borderRadius: 10 }}
                                    source={{ uri: `https://files.productabot.com/public/${project.image}` }}
                                />
                                :
                                <View style={{ width: 80, height: 80, marginRight: 10, borderColor: colors.text, borderWidth: 1, borderRadius: 10 }} />
                            }
                        </TouchableOpacity>
                        <Animated.View style={{ opacity: opacity }}>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={project.name} numberOfLines={1} style={[{ fontSize: 40, color: colors.text }, root.desktopWeb && { outlineWidth: 0 }]}
                                onChangeText={(value) => { setProject({ ...project, name: value }); }}
                                onBlur={async () => {
                                    await API.graphql(graphqlOperation(`mutation {
                                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {name: "${project.name}"}) {
                                      id
                                    }
                                  }`));
                                }}
                            />
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={project.description} numberOfLines={2} style={[{ fontSize: 20, color: colors.text }, root.desktopWeb && { outlineWidth: 0 }]}
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
                        </Animated.View>
                    </View>
                    {Platform.OS === 'web' && <TouchableOpacity onPress={() => { setSettings(!settings); }} ><Text style={{ fontSize: 30 }}>⚙️</Text></TouchableOpacity>}
                </View>
                {settings ?
                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 10, width: root.desktopWeb ? 600 : '100%', alignSelf: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>key: </Text>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={project.key} numberOfLines={2} style={{ backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, width: 80 }}
                                onChangeText={(value) => { setProject({ ...project, key: value }); }}
                                onBlur={async () => { await API.graphql(graphqlOperation(`mutation {update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {key: "${project.key}"}) {id} }`)); }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>color: </Text>
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
                                <View style={{ width: 100, height: 40, marginLeft: -5 }}>
                                    <WebView
                                        style={{ backgroundColor: 'transparent' }}
                                        ref={inputRef}
                                        source={{
                                            html: `<head>
                                                <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=no;" />
                                                </head>
                                                <body>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>goal:</Text>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={`${project.goal ? project.goal : ''}`} numberOfLines={2} style={{ backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, width: 50 }}
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
                            <Text style={{ fontSize: 20, color: colors.text, width: '40%', textAlign: 'left', marginLeft: 10 }}>hours per month</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>website: </Text>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={project.website} numberOfLines={2} style={{ backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, width: '78%' }}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>public: </Text>
                            <TouchableOpacity onPress={async () => {
                                setProject({ ...project, public: !project.public });
                                await API.graphql(graphqlOperation(`mutation {update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {public: ${project.public ? 'false' : 'true'}}) {id}}`));
                            }} style={{ flexDirection: 'row' }}>
                                <View style={{ borderWidth: 1, borderColor: colors.text, borderRadius: 5, height: 20, width: 20, marginRight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text, textAlign: 'center', fontWeight: 'bold' }}>{project.public ? '✓' : ''}</Text></View>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text onPress={async () => {
                                const archiveFunction = async () => {
                                    setLoading(true);
                                    await API.graphql(graphqlOperation(`mutation {update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {archived: true}) {id}}`));
                                    setLoading(false);
                                    navigation.goBack();
                                }
                                if (Platform.OS === 'ios') {
                                    Alert.alert('Warning', 'Are you sure you want to archive this project?', [{ style: 'cancel', text: 'no' }, {
                                        style: 'destructive', text: 'archive', onPress: archiveFunction
                                    }])
                                }
                                else {
                                    if (confirm('Are you sure you want to archive this project?')) {
                                        await archiveFunction();
                                    }
                                }

                            }} style={{ textAlign: 'center', color: colors.text }}>
                                archive project
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text onPress={async () => {
                                console.log('ahhh!');
                                const deleteFunction = async () => {
                                    setLoading(true);
                                    await API.graphql(graphqlOperation(`mutation {delete_projects_by_pk(id: "${project.id}") {id}}`));
                                    setLoading(false);
                                    navigation.goBack();
                                }
                                if (Platform.OS === 'ios') {
                                    Alert.alert('Warning', 'Are you sure you want to delete this project?', [{ style: 'cancel', text: 'no' }, {
                                        style: 'destructive', text: 'delete', onPress: deleteFunction
                                    }])
                                }
                                else {
                                    if (confirm('Are you sure you want to delete this project?')) {
                                        await deleteFunction();
                                    }
                                }

                            }} style={{ textAlign: 'center', color: '#ff0000' }}>
                                delete project
                            </Text>
                        </View>
                    </View>
                    :
                    <>
                        <SegmentedControl
                            appearance={colors.background === '#000000' ? 'dark' : 'light'}
                            style={{ width: '100%', marginTop: 10, marginBottom: 10 }}
                            values={[`files (${count.files ?? 0})`, `entries (${count.entries ?? 0})`, `tasks (${count.tasks ?? 0})`, `events (${count.events ?? 0})`]}
                            selectedIndex={index}
                            onChange={(e) => { setIndex(e.nativeEvent.selectedSegmentIndex); Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        />
                        <Animated.View style={{ opacity: opacity, width: '100%', height: window.height - (Platform.OS === 'web' ? 200 : 320) }}>
                            {index === 0 &&
                                <>
                                    <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
                                        <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5, marginRight: 10 }}
                                            onPress={async () => { addAction('sheet'); }}
                                        ><Text>{'add sheet'} +</Text></TouchableOpacity>
                                        <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5, marginRight: 10 }}
                                            onPress={async () => { addAction('document'); }}
                                        ><Text>{'add doc'} +</Text></TouchableOpacity>
                                        <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5, marginRight: 10 }}
                                            onPress={async () => { addAction('file'); }}
                                        ><Text>{'upload file'} +</Text></TouchableOpacity>
                                    </View>
                                    <CustomDraggableFlatList
                                        data={project.files}
                                        virtualHeight={window.height - 240}
                                        renderItem={(item) =>
                                            <>
                                                <Text style={{ fontSize: 14, width: '75%' }}>{item.item.type === 'document' ? '📄' : item.item.type === 'sheet' ? '📈' : item.item.type.startsWith('image') ? '🖼️' : item.item.type.endsWith('pdf') ? '📃' : '💻'} {`${item.item.title}`}</Text>
                                                {item.item.size && <Text style={{ fontSize: 14, width: '20%' }}>{`${formatBytes(item.item.size)}`}</Text>}
                                                <Text style={{ fontSize: 14, width: '5%' }}>☰</Text>
                                            </>
                                        }
                                        onPress={async (item) => {
                                            if (item.item.type === 'sheet') {
                                                if (Platform.OS === 'web') {
                                                    navigation.push('sheet', { id: item.item.id });
                                                }
                                                else {
                                                    alert('Sorry! Sheets are not supported on the mobile app at this time');
                                                }
                                            }
                                            else if (item.item.type === 'document') {
                                                navigation.push('document', { id: item.item.id });
                                            }
                                            else {
                                                let link = await Storage.get(`${project.id}/${item.item.title}`, { level: 'private', expires: 10 });
                                                await WebBrowser.openBrowserAsync(link.replace('https://pbot-prod-files.s3.us-east-2.amazonaws.com', 'https://files.productabot.com'));
                                            }
                                        }}
                                        onRename={async (item) => {
                                            const renameFunction = async (rename, extension) => {
                                                setLoading(true);
                                                if (rename) {
                                                    if (['document', 'sheet'].includes(item.item.type)) {
                                                        await API.graphql(graphqlOperation(`mutation{update_files_by_pk(pk_columns: {id: "${item.item.id}"}, _set: {title: "${rename}"}) {id}}`));
                                                    }
                                                    else {
                                                        try {
                                                            await Storage.copy({ key: `${project.id}/${item.item.title}`, level: 'private' }, { key: `${project.id}/${rename}${extension}`, level: 'private' });
                                                            await Storage.remove(`${project.id}/${item.item.title}`, { level: 'private' });
                                                            await API.graphql(graphqlOperation(`mutation{update_files_by_pk(pk_columns: {id: "${item.item.id}"}, _set: {title: "${rename}${extension}"}) {id}}`));
                                                        }
                                                        catch (err) {
                                                            console.log(err);
                                                        }
                                                    }
                                                }
                                                await onRefresh();
                                                setLoading(false);
                                            }


                                            let originalName = item.item.title;
                                            let extension = '';
                                            if (['document', 'sheet'].includes(item.item.type)) {
                                                let nameSplit = item.item.title.split('.');
                                                if (nameSplit.length > 0) {
                                                    originalName = nameSplit[0];
                                                    extension = '.' + nameSplit[1];
                                                }
                                            }
                                            if (Platform.OS !== 'web') {
                                                Alert.prompt('Rename', '', async (text) => {
                                                    await renameFunction(text, extension);
                                                }, 'plain-text', originalName);
                                            }
                                            else {
                                                let rename = prompt('Rename', originalName);
                                                await renameFunction(rename, extension);
                                            }
                                        }}
                                        onDelete={async (item) => {
                                            const deleteFunction = async () => {
                                                if (['sheet', 'document'].includes(item.item.type)) {
                                                    setLoading(true);
                                                    await API.graphql(graphqlOperation(`mutation {delete_files_by_pk(id: "${item.item.id}") {id}}`));
                                                    await onRefresh();
                                                    setLoading(false);
                                                }
                                                else {

                                                    try {
                                                        await Storage.remove(`${project.id}/${item.item.name}`, { level: 'private' });
                                                        await API.graphql(graphqlOperation(`mutation {delete_files_by_pk(id: "${item.item.id}") {id}}`));
                                                        await onRefresh();
                                                    }
                                                    catch (err) {
                                                        console.log(err);
                                                    }
                                                }
                                            }
                                            if (Platform.OS !== 'web') {
                                                Alert.alert('Warning', 'Are you sure you want to delete this document?',
                                                    [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                            }
                                            else if (confirm('Are you sure you want to delete this document?')) { await deleteFunction() }
                                        }}
                                        setContextPosition={setContextPosition}
                                        menuRef={menuRef}
                                        ListEmptyComponent={
                                            <TouchableOpacity
                                                onPress={async () => { addAction('document'); }}
                                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 10, borderRadius: 10, backgroundColor: colors.card }}>
                                                <Text style={{ fontSize: 14, width: '100%', textAlign: 'center' }}>{`add a document +`}</Text>
                                            </TouchableOpacity>}
                                        onDragEnd={async ({ data }) => {
                                            setProject({ ...project, files: data });
                                            await API.graphql(graphqlOperation(`mutation {
                                    ${data.map((document, documentIndex) => `data${documentIndex}: update_files_by_pk(pk_columns: {id: "${document.id}"}, _set: {order: ${documentIndex}}) {id}`)}
                                }`));
                                        }}
                                    />
                                </>
                            }
                            {index === 1 &&
                                <>
                                    {(count.timesheetHours) && <Text style={{ alignSelf: 'flex-start', marginBottom: -20, marginLeft: 5 }}>{`${count.timesheetHours} hours ${root.desktopWeb ? `(${(count.timesheetHours / 8).toFixed(2)} days)` : ``}`}</Text>}
                                    {(project.goal && root.desktopWeb) &&
                                        <Menu ref={goalRef} renderer={Popover} rendererProps={{ anchorStyle: { backgroundColor: '#000000', borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', marginTop: 13 }, placement: 'bottom' }}>
                                            <MenuTrigger onPress={() => { goalRef.current.open(); }} onMouseEnter={(e) => { clearTimeout(goalTimeout); goalTimeout = setTimeout(() => { goalRef.current.open(); }, 750); }} onMouseLeave={(e) => { clearTimeout(goalTimeout) }} style={{ flexDirection: 'row', width: 320, alignSelf: 'center', alignItems: 'center', marginBottom: -15, marginRight: -40 }}>
                                                <View style={{ flexDirection: 'row', width: 200, height: 15, backgroundColor: '#000000', borderColor: '#666666', borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center' }}>
                                                    <View style={{ height: '100%', backgroundColor: project.color === '#000000' ? colors.text : project.color, width: `${Math.min(count.weeklyGoal, 100)}%`, borderRadius: 3 }} />
                                                </View>
                                                <Text style={{ alignSelf: 'center', marginLeft: 5 }}>{`${count.weeklyGoal}% of goal`}</Text>
                                            </MenuTrigger>
                                            <MenuOptions customStyles={{ optionsWrapper: { backgroundColor: 'transparent', width: 600, height: 300 }, optionsContainer: { backgroundColor: 'transparent' } }}>
                                                <View style={{ backgroundColor: colors.background, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderColor: '#444444', borderWidth: 1, borderRadius: 10, borderStyle: 'solid', }}>
                                                    <Text style={{ color: colors.text }}>{`You worked ${count.weeklyGoalHours ? count.weeklyGoalHours : 0} out of ${project.goal} hours this month`}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-evenly', width: '100%', height: 200 }}>
                                                        {/* {project.entries.map(obj => <View style={{ backgroundColor: project.color, height: `${(obj.hours/8) * 100}%`, width: 5 }} />)} */}
                                                        <PieChart
                                                            chartConfig={{
                                                                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`
                                                            }}
                                                            data={Object.entries(project.entries.filter(obj => obj.date >= dateFromString && obj.date <= dateToString).reduce((acc, obj) => {
                                                                !acc ? acc = {} : null;
                                                                !acc[obj.category] ? acc[obj.category] = 0 : null;
                                                                acc[obj.category] += obj.hours;
                                                                return acc;
                                                            }
                                                                , {})).map((obj, index) => {
                                                                    return ({
                                                                        name: obj[0],
                                                                        hours: obj[1],
                                                                        color: chartColors[index],
                                                                        legendFontColor: colors.text,
                                                                        legendFontFamily: 'arial'
                                                                    })
                                                                })}
                                                            width={400}
                                                            height={200}
                                                            accessor={"hours"}
                                                            backgroundColor={"transparent"}
                                                        />
                                                    </View>
                                                </View>
                                            </MenuOptions>
                                        </Menu>
                                    }
                                    <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5, marginRight: 10 }}
                                        onPress={async () => { addAction('entry'); }}
                                    ><Text>{'add time entry'} +</Text></TouchableOpacity>
                                    <CustomDraggableFlatList
                                        data={project.entries}
                                        draggable={false}
                                        virtualSize={120}
                                        virtualHeight={window.height - 240}
                                        renderItem={(item) => {
                                            let date = new Date(item.item.date);
                                            date.setDate(date.getDate() + 1);
                                            return (
                                                <>
                                                    <View style={{ width: '30%', flexDirection: 'column', justifyContent: 'flex-start' }}>
                                                        <Text style={{ fontSize: 14 }}>{`⏱️ ${date.toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })}`}</Text>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                            <View style={{ backgroundColor: colors.hover, borderRadius: 10, paddingLeft: 7.5, paddingRight: 7.5, paddingTop: 2.5, paddingBottom: 2.5, marginTop: 5, marginLeft: root.desktopWeb ? 15 : 0 }}>
                                                                <Text style={{ fontSize: 14 }}>{item.item.category ? item.item.category : ''}</Text>
                                                            </View>
                                                            <View />
                                                        </View>
                                                    </View>
                                                    <Text style={{ fontSize: 14, width: '50%' }}>{`${item.item.details}`}</Text>
                                                    <Text numberOfLines={1} style={{ fontSize: 30, fontWeight: 'bold', width: '20%', textAlign: 'center' }}>{item.item.hours}<Text numberOfLines={1} style={{ fontSize: 16, fontWeight: 'normal' }}> hrs</Text></Text>
                                                </>
                                            );
                                        }}
                                        onPress={(item) => {
                                            navigation.push('entry', { id: item.item.id })
                                        }}
                                        onDelete={async (item) => {
                                            const deleteFunction = async () => {
                                                setLoading(true);
                                                await API.graphql(graphqlOperation(`mutation {delete_entries_by_pk(id: "${item.item.id}") {id}}`));
                                                await onRefresh();
                                                setLoading(false);
                                            }
                                            if (Platform.OS !== 'web') {
                                                Alert.alert('Warning', 'Are you sure you want to delete this time entry?',
                                                    [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                            }
                                            else if (confirm('Are you sure you want to delete this time entry?')) { await deleteFunction() }
                                        }}
                                        setContextPosition={setContextPosition}
                                        menuRef={menuRef}
                                        ListEmptyComponent={
                                            <TouchableOpacity
                                                onPress={async () => { addAction('entry'); }}
                                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 10, borderRadius: 10, backgroundColor: colors.card }}>
                                                <Text style={{ fontSize: 14, width: '100%', textAlign: 'center' }}>{`add an entry +`}</Text>
                                            </TouchableOpacity>}
                                    />
                                </>
                            }
                            {index === 2 &&
                                <>
                                    {Platform.OS === 'web' ?
                                        <TasksDesktopScreen setLoading={setLoading} navigation={navigation} projectScreen={true} givenProjectId={project?.id} />
                                        :
                                        <TasksScreen setLoading={setLoading} navigation={navigation} projectScreen={true} givenProjectId={project?.id} />
                                    }
                                </>
                            }
                            {index === 3 &&
                                <>
                                    <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5, marginRight: 10 }}
                                        onPress={async () => { addAction('event'); }}
                                    ><Text>{'add event'} +</Text></TouchableOpacity>
                                    <CustomDraggableFlatList
                                        data={project.events}
                                        draggable={false}
                                        virtualSize={120}
                                        virtualHeight={window.height - 240}
                                        renderItem={(item) => {
                                            let dateFrom = new Date(item.item.date_from);
                                            dateFrom.setDate(dateFrom.getDate() + 1);
                                            let dateTo = new Date(item.item.date_to);
                                            dateTo.setDate(dateTo.getDate() + 1);
                                            return (
                                                <>
                                                    <View style={{ width: '30%', flexDirection: 'column', justifyContent: 'flex-start' }}>
                                                        <Text style={{ fontSize: 14 }}>{`⏱️ ${dateFrom.toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })} - ${dateTo.toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })}`}</Text>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                            <View style={{ backgroundColor: colors.hover, borderRadius: 10, paddingLeft: 7.5, paddingRight: 7.5, paddingTop: 2.5, paddingBottom: 2.5, marginTop: 5, marginLeft: root.desktopWeb ? 15 : 0 }}>
                                                                <Text style={{ fontSize: 14 }}>{item.item.category ? item.item.category : ''}</Text>
                                                            </View>
                                                            <View />
                                                        </View>
                                                    </View>
                                                    <Text style={{ fontSize: 14, width: '50%' }}>{`${item.item.details}`}</Text>
                                                </>
                                            );
                                        }}
                                        onPress={(item) => {
                                            navigation.push('event', { id: item.item.id })
                                        }}
                                        onDelete={async (item) => {
                                            const deleteFunction = async () => {
                                                setLoading(true);
                                                await API.graphql(graphqlOperation(`mutation {delete_events_by_pk(id: "${item.item.id}") {id}}`));
                                                await onRefresh();
                                                setLoading(false);
                                            }
                                            if (Platform.OS !== 'web') {
                                                Alert.alert('Warning', 'Are you sure you want to delete this event?',
                                                    [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                            }
                                            else if (confirm('Are you sure you want to delete this time entry?')) { await deleteFunction() }
                                        }}
                                        setContextPosition={setContextPosition}
                                        menuRef={menuRef}
                                        ListEmptyComponent={
                                            <TouchableOpacity
                                                onPress={async () => { addAction('event'); }}
                                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 10, borderRadius: 10, backgroundColor: colors.card }}>
                                                <Text style={{ fontSize: 14, width: '100%', textAlign: 'center' }}>{`add event +`}</Text>
                                            </TouchableOpacity>}
                                    />
                                </>
                            }
                        </Animated.View>
                    </>}
            </View>
            <InputAccessoryViewComponent />
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer} >
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y, left: contextPosition.x } }} />
                <MenuOptions style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderStyle: 'solid', borderRadius: 10, width: 100, paddingLeft: 15, paddingTop: 5, paddingBottom: 5 }}>
                    {contextPosition.rename && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.rename();
                        await onRefresh();
                    }} ><Text style={{ color: colors.text }}>Rename</Text></TouchableOpacity>}
                    {contextPosition.delete && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.delete();
                        await onRefresh();
                    }}><Text style={{ color: colors.delete }}>Delete</Text></TouchableOpacity>}
                    <TouchableOpacity style={{ padding: 5, width: '100%' }}
                        onPress={() => { menuRef.current.close(); }}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
                </MenuOptions>
            </Menu>
        </View>
    );
}

const styles = StyleSheet.create({
    picker: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20 }
});